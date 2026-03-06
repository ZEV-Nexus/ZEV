import { generateObject } from "ai";
import { z } from "zod";
import { createTieredModel, createAgentError } from "@/shared/lib/ai";
import type { AIProvider } from "@/shared/store/ai-store";

// ─── Meet Action Schema ───

export const MeetActionType = z.enum([
  "CREATE_MEETING",
  "CREATE_MEETING_WITHOUT_TIME",
  "UPDATE_MEETING",
  "CANCEL_MEETING",
  "LIST_MEETINGS",
]);

export type MeetActionType = z.infer<typeof MeetActionType>;

// ─── Meet Extraction Schema ───

const MeetExtractionSchema = z.object({
  intent: MeetActionType,
  title: z
    .string()
    .nullable()
    .describe("Meeting title, or null if not specified"),
  start_time: z
    .string()
    .nullable()
    .describe("Meeting start time in ISO 8601 format, or null"),
  end_time: z
    .string()
    .nullable()
    .describe("Meeting end time in ISO 8601 format, or null"),
  attendees: z
    .array(z.string())
    .default([])
    .describe("Attendee email addresses"),
  event_id: z
    .string()
    .nullable()
    .describe("Existing event ID for update/cancel, or null"),
  confidence: z.number().min(0).max(1).describe("Extraction confidence"),
  require_confirmation: z
    .boolean()
    .default(true)
    .describe("Whether user confirmation is required before execution"),
  clarification_needed: z
    .string()
    .nullable()
    .describe(
      "If information is insufficient, a clear and minimal clarification question",
    ),
  missing_fields: z
    .array(z.string())
    .default([])
    .describe("List of missing required fields"),
});

export type MeetExtraction = z.infer<typeof MeetExtractionSchema>;

// ─── Meet Confirmation Schema ───

export const MeetConfirmationSchema = z.object({
  confirm: z.boolean(),
  title: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  attendees: z.array(z.string()).optional(),
});

export type MeetConfirmation = z.infer<typeof MeetConfirmationSchema>;

// ─── Meet Agent System Prompt ───

const MEET_SYSTEM_PROMPT = `你是一個 Google Meet 任務代理，嵌入於應用程式中。

你的唯一任務是：
1. 從使用者輸入中辨識是否為「會議相關操作」
2. 將操作轉換為結構化 JSON
3. 若資訊不足，提出明確且最少的澄清問題

支援的 Intent 範圍（僅限以下）：
• CREATE_MEETING（使用者有指定時間）
• CREATE_MEETING_WITHOUT_TIME（使用者未指定時間，或只想快速建立 Meet 連結）
• UPDATE_MEETING
• CANCEL_MEETING
• LIST_MEETINGS

Google Meet 本身不需要起始與結束時間即可建立會議空間（Space），因此：

CREATE_MEETING 必須包含：
• title
• start_time (ISO 8601)
• end_time (ISO 8601)
• attendees (email array，可為空陣列)

CREATE_MEETING_WITHOUT_TIME 必須包含：
• title（若使用者未指定標題，可根據語意推斷一個簡短標題）
• attendees (email array，可為空陣列)
• start_time 和 end_time 設為 null

判斷邏輯：
• 使用者明確指定了時間 → CREATE_MEETING
• 使用者未指定時間，或說「開個會議」「建立 Meet 連結」等 → CREATE_MEETING_WITHOUT_TIME

嚴格規則：
• 不自行猜測時間或參與者
• 不自動建立、修改或取消會議
• 所有行為透過 Google Meet REST API v2 執行（spaces.create）
• 若請求超出能力（例如錄製會議、監聽會議內容），必須拒絕並說明原因
• require_confirmation 預設為 true，但若使用者意圖非常明確可設為 false
• 輸出只允許 JSON，不得加入說明文字
• 若資訊不足，設定 missing_fields 並提供 clarification_needed`;

// ─── Extract Meet Action ───

export async function extractMeetAction(
  provider: AIProvider,
  apiKey: string,
  message: string,
  conversationContext?: string,
  currentTime?: string,
): Promise<MeetExtraction> {
  try {
    const model = createTieredModel(provider, apiKey, "medium");

    const { object } = await generateObject({
      model,
      schema: MeetExtractionSchema,
      system: MEET_SYSTEM_PROMPT,
      prompt: `Current time: ${currentTime || new Date().toISOString()}

User message:
${message}

${conversationContext ? `Recent conversation:\n${conversationContext}` : ""}`,
    });

    return object;
  } catch (error) {
    console.error("Meet Agent Error:", error);
    throw createAgentError(
      "MEET_EXTRACTION_FAILED",
      (error as Error)?.message || "Failed to extract Meet action",
    );
  }
}

// ─── Needs Clarification Check ───

export function needsMeetClarification(extraction: MeetExtraction): boolean {
  // CREATE_MEETING_WITHOUT_TIME 不需要時間，只需要 title
  if (extraction.intent === "CREATE_MEETING_WITHOUT_TIME") {
    return (
      extraction.clarification_needed !== null ||
      !extraction.title ||
      extraction.confidence < 0.7
    );
  }

  return (
    extraction.clarification_needed !== null ||
    extraction.missing_fields.length > 0 ||
    extraction.confidence < 0.7
  );
}

// ─── Needs Confirmation Check ───

export function needsMeetConfirmation(extraction: MeetExtraction): boolean {
  return extraction.require_confirmation || extraction.confidence < 0.9;
}

// ─── Build Meet Event Payload ───

export interface MeetEventPayload {
  title: string;
  start_time?: string | null;
  end_time?: string | null;
  attendees: string[];
}

export function buildMeetEventPayload(
  extraction: MeetExtraction,
  confirmation?: MeetConfirmation,
): MeetEventPayload | null {
  const title = confirmation?.title || extraction.title;
  const start_time = confirmation?.start_time || extraction.start_time;
  const end_time = confirmation?.end_time || extraction.end_time;
  const attendees = confirmation?.attendees || extraction.attendees;

  // Meet Space 不需要時間，只需要 title
  if (!title) return null;

  return {
    title,
    start_time,
    end_time,
    attendees: attendees || [],
  };
}

// ─── Build Fallback Confirmation Message (no LLM) ───

export function buildMeetFallbackConfirmation(
  extraction: MeetExtraction,
): string {
  const lines: string[] = [];

  if (extraction.intent === "CREATE_MEETING") {
    lines.push("📹 我為您準備了以下會議：", "");
    lines.push(`**標題**：${extraction.title || "⚠️ 未指定"}`);
    lines.push(`**開始時間**：${extraction.start_time || "⚠️ 未指定"}`);
    lines.push(`**結束時間**：${extraction.end_time || "⚠️ 未指定"}`);
    lines.push(
      `**參與者**：${extraction.attendees.length > 0 ? extraction.attendees.join("、") : "無"}`,
    );
    lines.push(`**信心度**：${Math.round(extraction.confidence * 100)}%`);
    lines.push("");
  } else if (extraction.intent === "CREATE_MEETING_WITHOUT_TIME") {
    lines.push("📹 我為您準備了以下會議：", "");
    lines.push(`**標題**：${extraction.title || "⚠️ 未指定"}`);
    lines.push(
      `**參與者**：${extraction.attendees.length > 0 ? extraction.attendees.join("、") : "無"}`,
    );
    lines.push(`**信心度**：${Math.round(extraction.confidence * 100)}%`);
    lines.push("");
  } else if (extraction.intent === "UPDATE_MEETING") {
    lines.push("✏️ 會議更新資訊：", "");
    if (extraction.title) lines.push(`**標題**：${extraction.title}`);
    if (extraction.start_time)
      lines.push(`**開始時間**：${extraction.start_time}`);
    if (extraction.end_time) lines.push(`**結束時間**：${extraction.end_time}`);
    lines.push("");
  } else if (extraction.intent === "CANCEL_MEETING") {
    lines.push("❌ 即將取消會議", "");
    if (extraction.title) lines.push(`**標題**：${extraction.title}`);
    lines.push("");
  } else if (extraction.intent === "LIST_MEETINGS") {
    lines.push("📋 正在查詢您的會議列表...");
    return lines.join("\n");
  }

  if (extraction.clarification_needed) {
    lines.push(`❓ ${extraction.clarification_needed}`);
  } else if (extraction.missing_fields.length > 0) {
    lines.push(`需要補充：${extraction.missing_fields.join("、")}`);
    lines.push("");
    lines.push("請提供以上資訊。");
  } else {
    lines.push("是否要建立這個會議？（將自動產生 Google Meet 連結）");
  }

  return lines.join("\n");
}
