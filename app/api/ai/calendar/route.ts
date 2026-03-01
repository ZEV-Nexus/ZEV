import { getCurrentUser } from "@/shared/service/server/auth";
import { resolveApiKey } from "@/shared/lib/ai";
import { apiResponse } from "@/shared/service/server/response";
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

// ─── POST: Extract task / Confirm schedule ───

export async function POST(req: Request) {
  const { message, roomId, modelKeyId, action, confirmation, task } =
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
    // ─── Confirm action ───
    if (action === "confirm" && task) {
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
      }

      return apiResponse({
        data: {
          type: "schedule_cancelled",
          message: "已取消建立行事曆事件。",
        },
      });
    }

    // ─── Extract task from message ───
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

    const extracted = await extractTask(
      provider,
      apiKey,
      message,
      context,
      new Date().toISOString(),
    );

    if (needsConfirmation(extracted)) {
      let confirmMessage: string;
      try {
        confirmMessage = await formatConfirmationMessage(
          provider,
          apiKey,
          extracted,
        );
      } catch {
        confirmMessage = buildFallbackConfirmation(extracted);
      }

      return apiResponse({
        data: {
          type: "confirm_schedule",
          task: extracted,
          message: confirmMessage,
        },
      });
    }

    // High confidence → auto create
    const event = buildCalendarEvent(extracted);
    if (!event) {
      return apiResponse({
        data: {
          type: "confirm_schedule",
          task: extracted,
          message: buildFallbackConfirmation(extracted),
        },
      });
    }

    // TODO: Call actual calendar API
    return apiResponse({
      data: {
        type: "schedule_created",
        event,
        message: `✅ 已建立行事曆事件：「${event.title}」於 ${event.start}`,
      },
    });
  } catch (error: unknown) {
    console.error("Calendar Route Error:", error);
    return apiResponse({
      ok: false,
      message: (error as Error)?.message || "Calendar operation failed",
      status: 500,
    });
  }
}
