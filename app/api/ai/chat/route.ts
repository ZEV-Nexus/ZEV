import { convertToModelMessages } from "ai";

import { getCurrentUser } from "@/shared/service/server/auth";

import { createModel, resolveApiKey } from "@/shared/lib/ai";

import { streamTextOutput } from "@/ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, modelKeyId, modelId, roomId, attachments, toolMentions } =
    await req.json();

  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!modelKeyId) {
    return new Response("Model Key ID is required", { status: 400 });
  }

  const resolved = await resolveApiKey(modelKeyId);
  if (!resolved) {
    return new Response(`Missing API Key for model key ID: ${modelKeyId}`, {
      status: 401,
    });
  }

  const { apiKey, provider } = resolved;

  const toolMentionNames: Record<string, string> = {
    gmail_action: "gmail_action（Gmail Agent）",
    create_schedule: "create_schedule（Calendar Agent）",
    meet_action: "meet_action（Meet Agent）",
    summarize_chat: "summarize_chat（總結對話）",
    translate_text: "translate_text（Translation Agent）",
    analyze_attachment: "analyze_attachment（Attachment Agent）",
  };

  const mentionedTools: string[] = Array.isArray(toolMentions)
    ? toolMentions
    : [];

  const toolMentionDirective =
    mentionedTools.length > 0
      ? `\n\n## ⚡ 使用者明確指定的工具\n使用者透過 @mention 明確要求使用以下工具，你 **必須** 優先使用這些工具來處理此次請求：\n${mentionedTools.map((t: string) => `- ${toolMentionNames[t] || t}`).join("\n")}\n請直接呼叫對應工具，不要詢問使用者是否要使用該工具。`
      : "";

  try {
    const model = createModel(provider, apiKey, modelId);
    const covertMessages = await convertToModelMessages(messages);
    const result = streamTextOutput(
      model,
      provider,
      apiKey,
      covertMessages,
      attachments,
      toolMentionDirective,
      user,
      roomId,
    );

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error("AI Chat Error:", error);
    return new Response((error as Error)?.message || "Internal Server Error", {
      status: 500,
    });
  }
}
