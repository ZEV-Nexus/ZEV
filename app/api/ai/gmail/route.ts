import { getCurrentUser } from "@/shared/service/server/auth";
import { resolveApiKey } from "@/shared/lib/ai";
import { apiResponse } from "@/shared/service/server/response";
import {
  extractGmailDraft,
  needsClarification,
  needsGmailConfirmation,
  buildGmailSendPayload,
  buildGmailFallbackConfirmation,
  type GmailConfirmation,
  type GmailDraft,
} from "@/ai/agents/gmail-agent";
import {
  googleGmail,
  sendGmailMessage,
  listGmailMessages,
  readGmailMessage,
} from "@/shared/lib/google-gmail";
import { findRefreshTokenByService } from "@/shared/service/server/user-oauth-account";
import { getMessages } from "@/shared/service/server/message";

export const maxDuration = 60;

// ─── Helper ───

function formatMessages(msgs: unknown[]): string {
  return (msgs as Array<Record<string, unknown>>)
    .map((m) => {
      const nickname =
        ((
          (m.member as Record<string, unknown>)?.user as Record<string, unknown>
        )?.nickname as string) || "Unknown";
      const content = (m.content as string) || "";
      const createdAt =
        (m.createdAt as Date)?.toISOString?.() || String(m.createdAt);
      return `[${createdAt}] ${nickname}: ${content}`;
    })
    .join("\n");
}

// ─── POST: Extract Gmail draft / Confirm send ───

export async function POST(req: Request) {
  const { message, roomId, modelKeyId, action, confirmation, draft } =
    await req.json();

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
    // ─── Confirm send action ───
    if (action === "confirm_gmail" && draft) {
      const conf = confirmation as GmailConfirmation;

      if (conf?.confirm) {
        const payload = buildGmailSendPayload(draft as GmailDraft, conf);
        if (!payload) {
          return apiResponse({
            data: {
              type: "error",
              error: {
                code: "INSUFFICIENT_CONTEXT",
                message: "收件者或郵件內容不足，無法寄送",
                required_fields: !draft.to ? ["to"] : ["body"],
              },
            },
          });
        }

        // Get Gmail OAuth token
        const refreshToken = await findRefreshTokenByService(user.id, "gmail");
        if (!refreshToken) {
          return apiResponse({
            data: {
              type: "error",
              error: {
                code: "GMAIL_NOT_CONNECTED",
                message: "請先連結 Google Gmail 帳號",
                required_fields: [],
              },
            },
          });
        }

        const gmail = await googleGmail(refreshToken);
        const result = await sendGmailMessage(gmail, payload);

        return apiResponse({
          data: {
            type: "gmail_sent",
            messageId: result.id,
            threadId: result.threadId,
            message: `✅ 郵件已成功寄送給 ${payload.to}`,
          },
        });
      }

      return apiResponse({
        data: {
          type: "gmail_cancelled",
          message: "已取消寄送郵件。",
        },
      });
    }

    // ─── List messages action ───
    if (action === "list_messages") {
      const refreshToken = await findRefreshTokenByService(user.id, "gmail");
      if (!refreshToken) {
        return apiResponse({
          data: {
            type: "error",
            error: {
              code: "GMAIL_NOT_CONNECTED",
              message: "請先連結 Google Gmail 帳號",
              required_fields: [],
            },
          },
        });
      }

      const gmail = await googleGmail(refreshToken);
      const messages = await listGmailMessages(gmail, 10);

      return apiResponse({
        data: {
          type: "gmail_messages",
          messages,
        },
      });
    }

    // ─── Read message action ───
    if (action === "read_message") {
      const { messageId } = await req.json().catch(() => ({}));

      const refreshToken = await findRefreshTokenByService(user.id, "gmail");
      if (!refreshToken) {
        return apiResponse({
          data: {
            type: "error",
            error: {
              code: "GMAIL_NOT_CONNECTED",
              message: "請先連結 Google Gmail 帳號",
              required_fields: [],
            },
          },
        });
      }

      const gmail = await googleGmail(refreshToken);
      const msg = await readGmailMessage(gmail, messageId);

      return apiResponse({
        data: {
          type: "gmail_message_detail",
          message: msg,
        },
      });
    }

    // ─── Extract Gmail draft from message ───
    if (!message) {
      return apiResponse({
        ok: false,
        message: "message is required",
        status: 400,
      });
    }

    let context = "";
    if (roomId) {
      const msgs = await getMessages(roomId, 20);
      context = formatMessages(msgs);
    }

    const extracted = await extractGmailDraft(
      provider,
      apiKey,
      message,
      context,
    );

    // If clarification is needed, ask user
    if (needsClarification(extracted)) {
      return apiResponse({
        data: {
          type: "gmail_clarification",
          draft: extracted,
          message:
            extracted.clarification_needed ||
            buildGmailFallbackConfirmation(extracted),
        },
      });
    }

    // If confirmation is needed (always true by design)
    if (needsGmailConfirmation(extracted)) {
      return apiResponse({
        data: {
          type: "confirm_gmail",
          draft: extracted,
          message: buildGmailFallbackConfirmation(extracted),
        },
      });
    }

    // Fallback: still require confirmation
    return apiResponse({
      data: {
        type: "confirm_gmail",
        draft: extracted,
        message: buildGmailFallbackConfirmation(extracted),
      },
    });
  } catch (error: unknown) {
    console.error("Gmail Route Error:", error);

    const agentError = error as { error?: { code?: string; message?: string } };
    if (agentError?.error?.code) {
      return apiResponse({
        ok: false,
        message: agentError.error.message,
        status: 500,
        error: agentError.error.code,
      });
    }

    return apiResponse({
      ok: false,
      message: (error as Error)?.message || "Gmail operation failed",
      status: 500,
    });
  }
}
