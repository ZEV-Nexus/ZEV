import { getCurrentUser } from "@/shared/service/server/auth";
import { resolveApiKey } from "@/shared/lib/ai";
import { apiResponse } from "@/shared/service/server/response";
import { processAttachments } from "@/ai/agents/attachment-agent";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { message, attachments, modelKeyId } = await req.json();

  const user = await getCurrentUser();
  if (!user) {
    return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
  }

  if (!modelKeyId) {
    return apiResponse({
      ok: false,
      message: "Model Key ID is required",
      status: 400,
    });
  }

  if (!Array.isArray(attachments) || attachments.length === 0) {
    return apiResponse({
      ok: false,
      message: "attachments are required",
      status: 400,
    });
  }

  const resolved = await resolveApiKey(modelKeyId);
  if (!resolved) {
    return apiResponse({
      ok: false,
      message: "Invalid API Key",
      status: 401,
    });
  }

  const { apiKey, provider } = resolved;

  try {
    const attachmentMeta = attachments.map(
      (att: {
        url: string;
        filename: string;
        mimeType: string;
        size: number;
        resourceType?: string;
      }) => ({
        url: att.url,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        resourceType: att.resourceType,
      }),
    );

    const result = await processAttachments(
      provider,
      apiKey,
      attachmentMeta,
      message || "",
    );

    return apiResponse({
      data: {
        type: "attachment_reply",
        responses: result.responses,
        summary: result.summary,
      },
    });
  } catch (error: unknown) {
    console.error("Attachment Route Error:", error);
    return apiResponse({
      ok: false,
      message: (error as Error)?.message || "Attachment processing failed",
      status: 500,
    });
  }
}
