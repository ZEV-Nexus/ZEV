import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import { z } from "zod";

import { getUserApiKey } from "@/shared/service/server/user-api-key";
import { getCurrentUser } from "@/shared/service/server/auth";
import { decrypt } from "@/shared/lib/key-authentication";
import { getMessages } from "@/shared/service/server/message";
import { apiResponse } from "@/shared/service/server/response";

export const maxDuration = 60;

// ─── Scope Schema ───
const ScopeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("relative_time"),
    value: z.number(),
    unit: z.enum(["minute", "hour", "day"]),
  }),
  z.object({
    type: z.literal("absolute_time"),
    from: z.string(),
    to: z.string(),
  }),
  z.object({
    type: z.literal("segment"),
    target: z.enum(["last", "previous"]),
  }),
  z.object({
    type: z.literal("message_count"),
    count: z.number(),
  }),
  z.object({
    type: z.literal("unknown"),
  }),
]);

type Scope = z.infer<typeof ScopeSchema>;

// ─── Helper: create AI model from provider ───
function createModel(provider: string, apiKey: string, modelId: string) {
  if (provider === "openai") {
    const openai = createOpenAI({ apiKey });
    return openai(modelId);
  } else if (provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey });
    return anthropic(modelId);
  } else if (provider === "google") {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(modelId);
  }
  throw new Error("Invalid provider");
}

// ─── Step 1: ScopeParserAgent ───
async function parseScopeAgent(
  model: Parameters<typeof generateObject>[0]["model"],
  userInput: string,
  now: string,
): Promise<Scope> {
  const { object } = await generateObject({
    model,
    schema: ScopeSchema,
    system: `你是一個「對話範圍解析器（Scope Parser）」。

你的任務是：
- 解析使用者的自然語言
- 判斷他想要的「聊天紀錄範圍」
- 輸出嚴格符合 schema 的 JSON

你必須遵守：
- 只輸出 JSON
- 不解釋
- 不補充
- 不推測聊天內容
- 不計算實際時間
- 不使用現在時間進行運算

如果無法判斷，輸出 type 為 "unknown"。`,
    prompt: `現在時間（僅作語境參考，不可用於計算）：${now}

請解析以下使用者請求，並輸出對話範圍 JSON：

「${userInput}」`,
  });

  return object;
}

// ─── Step 2: Resolve scope to messages ───
interface FormattedMessage {
  nickname: string;
  content: string;
  createdAt: string;
}

async function resolveMessages(
  scope: Scope,
  roomId: string,
  now: Date,
): Promise<{ messages: FormattedMessage[]; error?: string }> {
  if (scope.type === "unknown") {
    return {
      messages: [],
      error:
        "無法判斷您想總結的範圍，請提供更明確的描述，例如：「最近 1 小時」、「最近 50 則訊息」",
    };
  }

  if (scope.type === "message_count") {
    const msgs = await getMessages(roomId, scope.count);
    return { messages: formatMessages(msgs) };
  }

  if (scope.type === "segment") {
    // "last" = most recent 30 messages, "previous" = 30 before that
    const limit = scope.target === "last" ? 30 : 60;
    const msgs = await getMessages(roomId, limit);

    if (scope.target === "previous" && msgs.length > 30) {
      return { messages: formatMessages(msgs.slice(0, msgs.length - 30)) };
    }
    return { messages: formatMessages(msgs) };
  }

  if (scope.type === "relative_time") {
    const ms = convertToMs(scope.value, scope.unit);
    const from = new Date(now.getTime() - ms);
    // Fetch a reasonable amount and filter by time
    const msgs = await getMessages(roomId, 200);
    const filtered = msgs.filter(
      (m) => new Date(m.createdAt as unknown as string) >= from,
    );
    return { messages: formatMessages(filtered) };
  }

  if (scope.type === "absolute_time") {
    const from = new Date(scope.from);
    const to = new Date(scope.to);
    const msgs = await getMessages(roomId, 200);
    const filtered = msgs.filter((m) => {
      const t = new Date(m.createdAt as unknown as string);
      return t >= from && t <= to;
    });
    return { messages: formatMessages(filtered) };
  }

  return { messages: [], error: "未知的範圍類型" };
}

function convertToMs(value: number, unit: "minute" | "hour" | "day"): number {
  const multipliers = { minute: 60_000, hour: 3_600_000, day: 86_400_000 };
  return value * multipliers[unit];
}

function formatMessages(msgs: unknown[]): FormattedMessage[] {
  return (msgs as Array<Record<string, unknown>>).map((m) => ({
    nickname:
      (((m.member as Record<string, unknown>)?.user as Record<string, unknown>)
        ?.nickname as string) || "Unknown",
    content: (m.content as string) || "",
    createdAt: (m.createdAt as Date)?.toISOString?.() || String(m.createdAt),
  }));
}

// ─── Step 3: SummaryAgent ───
async function summarizeAgent(
  model: Parameters<typeof generateText>[0]["model"],
  messages: FormattedMessage[],
): Promise<string> {
  const chatLog = messages
    .map((m) => `[${m.createdAt}] ${m.nickname}: ${m.content}`)
    .join("\n");

  const { text } = await generateText({
    model,
    system: `你是一個聊天紀錄總結助手。

你的任務是：
- 閱讀提供的聊天紀錄
- 生成一份簡潔、結構化的摘要
- 使用繁體中文

摘要格式：
1. **概覽**：一句話描述這段對話的主題
2. **重點摘要**：列出 3-7 個要點
3. **結論/待辦事項**：若有決議或待辦事項請列出

注意：
- 保持客觀，不添加未提及的內容
- 若訊息過少，簡短總結即可
- 提及參與者的暱稱`,
    prompt: `請總結以下聊天紀錄（共 ${messages.length} 則訊息）：

${chatLog}`,
  });

  return text;
}

// ─── Main Route ───
export async function POST(req: Request) {
  const { userInput, roomId, modelKeyId, modelId } = await req.json();

  const user = await getCurrentUser();
  if (!user) {
    return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
  }

  if (!roomId || !userInput) {
    return apiResponse({
      ok: false,
      message: "roomId and userInput are required",
      status: 400,
    });
  }

  if (!modelKeyId) {
    return apiResponse({
      ok: false,
      message: "Model Key ID is required",
      status: 400,
    });
  }

  // Resolve API key
  const apiKeyData = await getUserApiKey(modelKeyId);
  if (!apiKeyData) {
    return apiResponse({
      ok: false,
      message: `Missing API Key for model key ID: ${modelKeyId}`,
      status: 401,
    });
  }

  const apiKey = decrypt({
    iv: apiKeyData.ivKey || "",
    tag: apiKeyData.tag || "",
    content: apiKeyData.apiKey || "",
  });

  if (!apiKey) {
    return apiResponse({
      ok: false,
      message: "Failed to decrypt API key",
      status: 401,
    });
  }

  try {
    const model = createModel(apiKeyData.provider, apiKey, modelId || "gpt-4o");
    const now = new Date();

    // Step 1: Parse scope
    const scope = await parseScopeAgent(model, userInput, now.toISOString());

    // If unknown, ask user to clarify
    if (scope.type === "unknown") {
      return apiResponse({
        data: {
          scope,
          needsClarification: true,
          summary: null,
          message:
            "無法判斷您想總結的範圍，請提供更明確的描述，例如：「最近 1 小時」、「最近 50 則訊息」、「剛剛那段對話」",
        },
      });
    }

    // Step 2: Resolve messages
    const { messages, error } = await resolveMessages(scope, roomId, now);

    if (error) {
      return apiResponse({
        data: {
          scope,
          needsClarification: true,
          summary: null,
          message: error,
        },
      });
    }

    if (messages.length === 0) {
      return apiResponse({
        data: {
          scope,
          needsClarification: false,
          summary: null,
          message: "在指定範圍內找不到任何訊息",
        },
      });
    }

    // Step 3: Summarize
    const summary = await summarizeAgent(model, messages);

    return apiResponse({
      data: {
        scope,
        needsClarification: false,
        summary,
        messageCount: messages.length,
      },
    });
  } catch (error: unknown) {
    console.error("Summarize Error:", error);
    return apiResponse({
      ok: false,
      message: (error as Error)?.message || "Internal Server Error",
      status: 500,
    });
  }
}
