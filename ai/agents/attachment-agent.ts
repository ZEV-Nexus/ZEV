import { generateText } from "ai";
import { createTieredModel, createAgentError } from "@/shared/lib/ai";
import type { AIProvider } from "@/shared/store/ai-store";

// ─── Attachment Types ───

interface AttachmentMeta {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  resourceType?: string;
}

type AttachmentCategory = "image" | "file";

function categorizeAttachment(attachment: AttachmentMeta): AttachmentCategory {
  if (
    attachment.mimeType?.startsWith("image/") ||
    attachment.resourceType === "image"
  ) {
    return "image";
  }
  return "file";
}

// ─── Vision Agent (Images) ───

const VISION_SYSTEM_PROMPT = `You are an image analysis assistant.

Constraints:
- Do not infer private or sensitive information.
- Do not assume intent beyond the user's message.
- If the image content is unclear, ask for clarification.

Your tasks:
- Describe what you see in the image.
- Infer context based on the user's message.
- Answer the user's question about the image.
- Use 繁體中文 to respond.`;

async function visionAgent(
  provider: AIProvider,
  apiKey: string,
  imageUrl: string,
  userMessage: string,
): Promise<string> {
  try {
    // Vision requires large model
    const model = createTieredModel(provider, apiKey, "large");

    const { text } = await generateText({
      model,
      system: VISION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: userMessage || "請描述這張圖片" },
            { type: "image", image: new URL(imageUrl) },
          ],
        },
      ],
    });

    return text;
  } catch (error) {
    console.error("Vision Agent Error:", error);
    throw createAgentError(
      "VISION_ANALYSIS_FAILED",
      (error as Error)?.message || "Failed to analyze image",
    );
  }
}

// ─── Document Agent (Files) ───

const DOCUMENT_SYSTEM_PROMPT = `You are a document analysis assistant.

Constraints:
- Do not infer private or sensitive information.
- Do not assume intent beyond the user's message.
- If the file content is unclear, ask for clarification.

Your tasks:
- Identify the file type from its metadata.
- Suggest how the file might be relevant to the conversation.
- Answer the user's question about the file.
- Use 繁體中文 to respond.`;

async function documentAgent(
  provider: AIProvider,
  apiKey: string,
  attachment: AttachmentMeta,
  userMessage: string,
): Promise<string> {
  try {
    const model = createTieredModel(provider, apiKey, "medium");

    const { text } = await generateText({
      model,
      system: DOCUMENT_SYSTEM_PROMPT,
      prompt: `使用者訊息：${userMessage || "請分析這個檔案"}

檔案資訊：
- 檔名：${attachment.filename}
- 類型：${attachment.mimeType}
- 大小：${(attachment.size / 1024).toFixed(1)} KB
- URL：${attachment.url}

請根據檔案的元資料回覆使用者。`,
    });

    return text;
  } catch (error) {
    console.error("Document Agent Error:", error);
    throw createAgentError(
      "DOCUMENT_ANALYSIS_FAILED",
      (error as Error)?.message || "Failed to analyze document",
    );
  }
}

// ─── Attachment Router ───

export interface AttachmentReply {
  responses: Array<{
    filename: string;
    category: AttachmentCategory;
    reply: string;
  }>;
  summary: string;
}

export async function processAttachments(
  provider: AIProvider,
  apiKey: string,
  attachments: AttachmentMeta[],
  userMessage: string,
): Promise<AttachmentReply> {
  try {
    const responses = await Promise.all(
      attachments.map(async (attachment) => {
        const category = categorizeAttachment(attachment);

        let reply: string;
        if (category === "image") {
          reply = await visionAgent(
            provider,
            apiKey,
            attachment.url,
            userMessage,
          );
        } else {
          reply = await documentAgent(
            provider,
            apiKey,
            attachment,
            userMessage,
          );
        }

        return {
          filename: attachment.filename,
          category,
          reply,
        };
      }),
    );

    // Build summary if multiple attachments
    const summary =
      responses.length === 1
        ? responses[0].reply
        : responses
            .map((r) => `**${r.filename}**：${r.reply}`)
            .join("\n\n---\n\n");

    return { responses, summary };
  } catch (error) {
    console.error("Attachment Processing Error:", error);
    throw createAgentError(
      "ATTACHMENT_PROCESSING_FAILED",
      (error as Error)?.message || "Failed to process attachments",
    );
  }
}
