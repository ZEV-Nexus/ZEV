import { generateObject } from "ai";
import { z } from "zod";
import { createTieredModel, createAgentError } from "@/shared/lib/ai";
import type { AIProvider } from "@/shared/store/ai-store";

// ─── Gmail Action Schema ───

export const GmailActionType = z.enum([
  "DRAFT_REPLY",
  "DRAFT_NEW",
  "LIST_MESSAGES",
  "READ_MESSAGE",
]);

export type GmailActionType = z.infer<typeof GmailActionType>;

// ─── Gmail Draft Extraction Schema ───

const GmailDraftSchema = z.object({
  action: GmailActionType,
  to: z
    .string()
    .nullable()
    .describe("Recipient email address, or null if unknown"),
  subject: z
    .string()
    .nullable()
    .describe("Email subject line, or null if reply"),
  body: z.string().describe("Email body content"),
  in_reply_to: z
    .string()
    .nullable()
    .describe("Reference description of the email being replied to, or null"),
  confidence: z.number().min(0).max(1).describe("Extraction confidence"),
  require_confirmation: z
    .boolean()
    .default(true)
    .describe("Whether user confirmation is required before sending"),
  clarification_needed: z
    .string()
    .nullable()
    .describe(
      "If information is insufficient, a clear and minimal clarification question",
    ),
});

export type GmailDraft = z.infer<typeof GmailDraftSchema>;

// ─── Gmail Confirmation Schema ───

export const GmailConfirmationSchema = z.object({
  confirm: z.boolean(),
  to: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
});

export type GmailConfirmation = z.infer<typeof GmailConfirmationSchema>;

// ─── Gmail Agent System Prompt ───

const GMAIL_SYSTEM_PROMPT = `你是一個 Gmail 任務代理，嵌入於應用程式中。

你的唯一任務是：
1. 從使用者輸入中辨識是否為「郵件相關操作」
2. 將操作轉換為結構化 JSON

嚴格規則：
• 不自行猜測收件者、時間、郵件內容
• 不自動寄送或刪除郵件
• 所有行為必須可對應 Gmail API
• 若請求超出能力，必須拒絕並說明原因
• 若資訊不足，提出明確且最少的澄清問題
• require_confirmation 必須始終為 true
• 輸出只允許 JSON

Action types:
- DRAFT_REPLY: Reply to an existing email
- DRAFT_NEW: Compose a new email
- LIST_MESSAGES: List recent emails
- READ_MESSAGE: Read a specific email`;

// ─── Extract Gmail Draft ───

export async function extractGmailDraft(
  provider: AIProvider,
  apiKey: string,
  message: string,
  conversationContext?: string,
): Promise<GmailDraft> {
  try {
    const model = createTieredModel(provider, apiKey, "medium");

    const { object } = await generateObject({
      model,
      schema: GmailDraftSchema,
      system: GMAIL_SYSTEM_PROMPT,
      prompt: `User message:
${message}

${conversationContext ? `Recent conversation:\n${conversationContext}` : ""}`,
    });

    return object;
  } catch (error) {
    console.error("Gmail Agent Error:", error);
    throw createAgentError(
      "GMAIL_EXTRACTION_FAILED",
      (error as Error)?.message || "Failed to extract Gmail draft",
    );
  }
}

// ─── Needs Clarification Check ───

export function needsClarification(draft: GmailDraft): boolean {
  return draft.clarification_needed !== null || draft.confidence < 0.7;
}

// ─── Needs Confirmation Check ───

export function needsGmailConfirmation(draft: GmailDraft): boolean {
  return draft.require_confirmation || draft.confidence < 0.9;
}

// ─── Build Gmail Send Payload ───

export interface GmailSendPayload {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
}

export function buildGmailSendPayload(
  draft: GmailDraft,
  confirmation?: GmailConfirmation,
): GmailSendPayload | null {
  const to = confirmation?.to || draft.to;
  const subject = confirmation?.subject || draft.subject;
  const body = confirmation?.body || draft.body;

  if (!to || !body) return null;

  return {
    to,
    subject: subject || "",
    body,
  };
}

// ─── Build Fallback Confirmation Message (no LLM) ───

export function buildGmailFallbackConfirmation(draft: GmailDraft): string {
  const lines: string[] = ["📧 我為您準備了以下郵件草稿：", ""];

  lines.push(`**操作**：${draft.action}`);
  lines.push(`**收件者**：${draft.to || "⚠️ 未指定"}`);
  if (draft.subject) lines.push(`**主旨**：${draft.subject}`);
  if (draft.in_reply_to) lines.push(`**回覆**：${draft.in_reply_to}`);
  lines.push(`**內容**：`);
  lines.push(`> ${draft.body}`);
  lines.push(`**信心度**：${Math.round(draft.confidence * 100)}%`);
  lines.push("");

  if (draft.clarification_needed) {
    lines.push(`❓ ${draft.clarification_needed}`);
  } else {
    const missing: string[] = [];
    if (!draft.to) missing.push("收件者");
    if (!draft.subject && draft.action === "DRAFT_NEW") missing.push("主旨");

    if (missing.length > 0) {
      lines.push(`需要補充：${missing.join("、")}`);
      lines.push("");
      lines.push("請提供以上資訊。");
    } else {
      lines.push("是否要寄出這封郵件？");
    }
  }

  return lines.join("\n");
}
