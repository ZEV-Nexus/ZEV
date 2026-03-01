import { getCurrentUser } from "@/shared/service/server/auth";
import { resolveApiKey } from "@/shared/lib/ai";
import { apiResponse } from "@/shared/service/server/response";
import { classifyIntent } from "@/ai/agents/intent-router";
import {
  extractTask,
  needsConfirmation,
  buildCalendarEvent,
  type CalendarConfirmation,
} from "@/ai/agents/calendar-agent";
import {
  formatConfirmationMessage,
  buildFallbackConfirmation,
} from "@/ai/agents/confirmation-agent";
import { translateText } from "@/ai/agents/translation-agent";
import { processAttachments } from "@/ai/agents/attachment-agent";
import {
  extractGmailDraft,
  needsClarification,
  needsGmailConfirmation,
  buildGmailSendPayload,
  buildGmailFallbackConfirmation,
  type GmailConfirmation,
  type GmailDraft,
} from "@/ai/agents/gmail-agent";
import { googleGmail, sendGmailMessage } from "@/shared/lib/google-gmail";
import { findRefreshTokenByService } from "@/shared/service/server/user-oauth-account";
import { getMessages } from "@/shared/service/server/message";

export const maxDuration = 60;

// ─── Helper: format recent messages for context ───

interface FormattedMessage {
  nickname: string;
  content: string;
  createdAt: string;
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

async function getConversationContext(roomId: string): Promise<string> {
  const msgs = await getMessages(roomId, 20);
  const formatted = formatMessages(msgs);
  return formatted
    .map((m) => `[${m.createdAt}] ${m.nickname}: ${m.content}`)
    .join("\n");
}

// ─── Main Route: Intent Router Entry Point ───

export async function POST(req: Request) {
  const {
    message,
    roomId,
    modelKeyId,
    attachments,
    // Calendar confirmation flow
    action,
    confirmation,
    task,
    // Gmail confirmation flow
    draft,
    // Translation params
    targetLanguage,
  } = await req.json();

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
    // ─── Handle calendar confirmation action ───
    if (action === "confirm_schedule" && task) {
      const conf = confirmation as CalendarConfirmation;

      if (conf?.confirm) {
        const event = buildCalendarEvent(task, conf);
        if (!event) {
          return apiResponse({
            data: {
              type: "error",
              error: {
                code: "INSUFFICIENT_CONTEXT",
                message: "日期資訊不足，無法建立事件",
                required_fields: ["date"],
              },
            },
          });
        }

        // TODO: Call actual calendar API (Google / Apple / Outlook)
        return apiResponse({
          data: {
            type: "schedule_created",
            event,
            message: `✅ 已建立行事曆事件：「${event.title}」於 ${event.start}`,
          },
        });
      } else {
        return apiResponse({
          data: {
            type: "schedule_cancelled",
            message: "已取消建立行事曆事件。",
          },
        });
      }
    }

    // ─── Handle Gmail confirmation action ───
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
      } else {
        return apiResponse({
          data: {
            type: "gmail_cancelled",
            message: "已取消寄送郵件。",
          },
        });
      }
    }

    // ─── Step 1: Intent Classification ───
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    const intentResult = await classifyIntent(
      provider,
      apiKey,
      message,
      undefined,
      hasAttachments,
    );

    // ─── Step 2: Dispatch by intent ───

    // --- create_schedule ---
    if (intentResult.intent === "create_schedule") {
      const context = roomId ? await getConversationContext(roomId) : "";

      const taskExtraction = await extractTask(
        provider,
        apiKey,
        message,
        context,
        new Date().toISOString(),
      );

      if (needsConfirmation(taskExtraction)) {
        let confirmMessage: string;
        try {
          confirmMessage = await formatConfirmationMessage(
            provider,
            apiKey,
            taskExtraction,
          );
        } catch {
          confirmMessage = buildFallbackConfirmation(taskExtraction);
        }

        return apiResponse({
          data: {
            type: "confirm_schedule",
            intent: intentResult,
            task: taskExtraction,
            message: confirmMessage,
          },
        });
      }

      // High confidence → auto create
      const event = buildCalendarEvent(taskExtraction);
      if (!event) {
        return apiResponse({
          data: {
            type: "confirm_schedule",
            intent: intentResult,
            task: taskExtraction,
            message: buildFallbackConfirmation(taskExtraction),
          },
        });
      }

      // TODO: Call actual calendar API
      return apiResponse({
        data: {
          type: "schedule_created",
          intent: intentResult,
          event,
          message: `✅ 已建立行事曆事件：「${event.title}」於 ${event.start}`,
        },
      });
    }

    // --- translate ---
    if (intentResult.intent === "translate") {
      const lang = targetLanguage || "English";
      const result = await translateText(provider, apiKey, message, lang);

      return apiResponse({
        data: {
          type: "translation",
          intent: intentResult,
          translation: result.translation,
          cached: result.cached,
          targetLanguage: lang,
        },
      });
    }

    // --- reply_with_attachment ---
    if (intentResult.intent === "reply_with_attachment" && hasAttachments) {
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
        message,
      );

      return apiResponse({
        data: {
          type: "attachment_reply",
          intent: intentResult,
          responses: result.responses,
          summary: result.summary,
        },
      });
    }

    // --- gmail_draft ---
    if (intentResult.intent === "gmail_draft") {
      const context = roomId ? await getConversationContext(roomId) : "";

      const gmailDraft = await extractGmailDraft(
        provider,
        apiKey,
        message,
        context,
      );

      // If clarification is needed
      if (needsClarification(gmailDraft)) {
        return apiResponse({
          data: {
            type: "gmail_clarification",
            intent: intentResult,
            draft: gmailDraft,
            message:
              gmailDraft.clarification_needed ||
              buildGmailFallbackConfirmation(gmailDraft),
          },
        });
      }

      // Always require confirmation before sending
      if (needsGmailConfirmation(gmailDraft)) {
        return apiResponse({
          data: {
            type: "confirm_gmail",
            intent: intentResult,
            draft: gmailDraft,
            message: buildGmailFallbackConfirmation(gmailDraft),
          },
        });
      }

      // Fallback: still require confirmation
      return apiResponse({
        data: {
          type: "confirm_gmail",
          intent: intentResult,
          draft: gmailDraft,
          message: buildGmailFallbackConfirmation(gmailDraft),
        },
      });
    }

    // --- none / fallback ---
    return apiResponse({
      data: {
        type: "none",
        intent: intentResult,
        message: null,
      },
    });
  } catch (error: unknown) {
    console.error("Intent Route Error:", error);

    // Check if it's an AgentError
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
      message: (error as Error)?.message || "Internal Server Error",
      status: 500,
    });
  }
}
