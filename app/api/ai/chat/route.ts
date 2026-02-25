import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText, tool, stepCountIs } from "ai";
import { z } from "zod";

import { getUserApiKey } from "@/shared/service/server/user-api-key";
import { getCurrentUser } from "@/shared/service/server/auth";
import { decrypt } from "@/shared/lib/key-authentication";
import { getMessages } from "@/shared/service/server/message";

export const maxDuration = 60;

// ─── Helpers ───

interface FormattedMessage {
  nickname: string;
  content: string;
  createdAt: string;
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

export async function POST(req: Request) {
  const { messages, modelKeyId, modelId, roomId } = await req.json();

  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!modelKeyId) {
    return new Response("Model Key ID is required", { status: 400 });
  }

  let model;

  const apiKeyData = await getUserApiKey(modelKeyId);
  if (!apiKeyData) {
    return new Response(`Missing API Key for model key ID: ${modelKeyId}`, {
      status: 401,
    });
  }
  const apiKey = decrypt({
    iv: apiKeyData?.ivKey || "",
    tag: apiKeyData?.tag || "",
    content: apiKeyData?.apiKey || "",
  });

  try {
    if (apiKeyData.provider === "openai") {
      if (!apiKey) {
        return new Response("Missing OpenAI API Key", { status: 401 });
      }
      const openai = createOpenAI({ apiKey });
      model = openai(modelId);
    } else if (apiKeyData.provider === "anthropic") {
      if (!apiKey) {
        return new Response("Missing Anthropic API Key", { status: 401 });
      }
      const anthropic = createAnthropic({ apiKey });
      model = anthropic(modelId);
    } else if (apiKeyData.provider === "google") {
      if (!apiKey) {
        return new Response("Missing Google API Key", { status: 401 });
      }
      const google = createGoogleGenerativeAI({ apiKey });
      model = google(modelId);
    } else {
      return new Response("Invalid Model ID", { status: 400 });
    }

    const now = new Date();

    const result = streamText({
      model,
      messages: await convertToModelMessages(messages),
      system: `你是一個有用的 AI 助理，名為 ZEV AI。你可以回答使用者的問題，也可以在使用者要求時總結聊天紀錄。

當使用者要求總結對話/聊天紀錄時，使用 summarize_chat 工具來擷取並總結訊息。
你需要從使用者的自然語言中判斷對話範圍，然後呼叫工具。

範圍判斷規則：
- 「最近 X 小時/分鐘/天」→ 使用 scope_type: "relative_time"
- 「最近 N 則訊息」→ 使用 scope_type: "message_count"
- 「剛剛那段」「最近那段對話」→ 使用 scope_type: "segment", target: "last"
- 「上一段」「前一段」→ 使用 scope_type: "segment", target: "previous"
- 如果使用者只說「幫我總結」但沒有指定範圍，先詢問他想總結多少訊息或多久的對話

當工具返回總結結果後，請以結構化格式呈現給使用者。

對於非總結相關的問題，直接回答即可，不需要使用工具。

現在時間：${now.toISOString()}
使用繁體中文回答。`,
      tools: {
        summarize_chat: tool({
          description: `你是一個商用聊天軟體中的「對話總結助理」。

你的任務是：
- 從一段聊天室對話中
- 提取可行的資訊與結論
- 不加入個人推測
- 不補充對話中不存在的內容

你必須遵守：
- 只根據提供的對話紀錄
- 不引用範圍外資訊
- 不猜測參與者意圖`,
          inputSchema: z.object({
            scope_type: z
              .enum(["relative_time", "message_count", "segment"])
              .describe("範圍類型"),
            time_value: z
              .number()
              .optional()
              .describe("時間數值（當 scope_type 為 relative_time 時）"),
            time_unit: z
              .enum(["minute", "hour", "day"])
              .optional()
              .describe("時間單位（當 scope_type 為 relative_time 時）"),
            message_count: z
              .number()
              .optional()
              .describe("訊息數量（當 scope_type 為 message_count 時）"),
            segment_target: z
              .enum(["last", "previous"])
              .optional()
              .describe("段落目標（當 scope_type 為 segment 時）"),
          }),
          execute: async ({
            scope_type,
            time_value,
            time_unit,
            message_count,
            segment_target,
          }) => {
            if (!roomId) {
              return { error: "未提供聊天室 ID，無法擷取訊息。" };
            }

            let formattedMsgs: FormattedMessage[] = [];

            try {
              if (scope_type === "message_count") {
                const count = message_count || 30;
                const msgs = await getMessages(roomId, count);
                formattedMsgs = formatMessages(msgs);
              } else if (scope_type === "segment") {
                const target = segment_target || "last";
                const limit = target === "last" ? 30 : 60;
                const msgs = await getMessages(roomId, limit);
                if (target === "previous" && msgs.length > 30) {
                  formattedMsgs = formatMessages(
                    msgs.slice(0, msgs.length - 30),
                  );
                } else {
                  formattedMsgs = formatMessages(msgs);
                }
              } else if (scope_type === "relative_time") {
                const val = time_value || 1;
                const unit = time_unit || "hour";
                const ms = convertToMs(val, unit);
                const from = new Date(now.getTime() - ms);
                const msgs = await getMessages(roomId, 200);
                const filtered = msgs.filter(
                  (m) => new Date(m.createdAt as unknown as string) >= from,
                );
                formattedMsgs = formatMessages(filtered);
              }

              if (formattedMsgs.length === 0) {
                return {
                  error: "在指定範圍內找不到任何訊息。",
                  messageCount: 0,
                };
              }

              const chatLog = formattedMsgs
                .map((m) => `[${m.createdAt}] ${m.nickname}: ${m.content}`)
                .join("\n");

              return {
                messageCount: formattedMsgs.length,
                chatLog,
              };
            } catch (error) {
              console.error("Summarize tool error:", error);
              return { error: "擷取訊息時發生錯誤，請稍後再試。" };
            }
          },
        }),
      },
      stopWhen: stepCountIs(3),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error("AI Chat Error:", error);
    return new Response((error as Error)?.message || "Internal Server Error", {
      status: 500,
    });
  }
}
