import { getCurrentUser } from "@/shared/service/server/auth";
import { resolveApiKey } from "@/shared/lib/ai";
import { apiResponse } from "@/shared/service/server/response";
import {
  extractMeetAction,
  needsMeetClarification,
  needsMeetConfirmation,
  buildMeetEventPayload,
  buildMeetFallbackConfirmation,
  type MeetConfirmation,
  type MeetExtraction,
} from "@/ai/agents/meet-agent";
import {
  googleCalendar,
  createGoogleCalendarEvent,
} from "@/shared/lib/google-calendar";
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

// ─── POST: Extract meet action / Confirm meeting ───

export async function POST(req: Request) {
  const { message, roomId, modelKeyId, action, confirmation, meeting } =
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
    // ─── Confirm create meeting action ───
    if (action === "confirm_meet" && meeting) {
      const conf = confirmation as MeetConfirmation;

      if (conf?.confirm) {
        const payload = buildMeetEventPayload(meeting as MeetExtraction, conf);
        if (!payload) {
          return apiResponse({
            data: {
              type: "error",
              error: {
                code: "INSUFFICIENT_CONTEXT",
                message: "會議標題或時間資訊不足，無法建立會議",
                required_fields: [
                  ...(!meeting.title ? ["title"] : []),
                  ...(!meeting.start_time ? ["start_time"] : []),
                  ...(!meeting.end_time ? ["end_time"] : []),
                ],
              },
            },
          });
        }

        // Get Calendar OAuth token
        const refreshToken = await findRefreshTokenByService(
          user.id,
          "calendar",
        );
        if (!refreshToken) {
          return apiResponse({
            data: {
              type: "error",
              error: {
                code: "CALENDAR_NOT_CONNECTED",
                message: "請先連結 Google 帳號",
                required_fields: [],
              },
            },
          });
        }

        const calendar = await googleCalendar(refreshToken);

        // Create event with Google Meet conference
        const event = await createGoogleCalendarEvent(calendar, "primary", {
          summary: payload.title,
          start: { dateTime: payload.start_time },
          end: { dateTime: payload.end_time },
          attendees: payload.attendees.map((email) => ({ email })),
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        });

        const meetLink =
          event.conferenceData?.entryPoints?.find(
            (e) => e.entryPointType === "video",
          )?.uri || null;

        return apiResponse({
          data: {
            type: "meet_created",
            event: {
              id: event.id,
              title: event.summary,
              start: event.start,
              end: event.end,
              meetLink,
              htmlLink: event.htmlLink,
            },
            message: `✅ 已建立會議：「${event.summary}」\n🕐 ${event.start?.dateTime} ~ ${event.end?.dateTime}${meetLink ? `\n🔗 Meet 連結：${meetLink}` : ""}`,
          },
        });
      }

      return apiResponse({
        data: {
          type: "meet_cancelled",
          message: "已取消建立會議。",
        },
      });
    }

    // ─── List meetings action ───
    if (action === "list_meetings") {
      const refreshToken = await findRefreshTokenByService(user.id, "calendar");
      if (!refreshToken) {
        return apiResponse({
          data: {
            type: "error",
            error: {
              code: "CALENDAR_NOT_CONNECTED",
              message: "請先連結 Google 帳號",
              required_fields: [],
            },
          },
        });
      }

      const calendar = await googleCalendar(refreshToken);
      const now = new Date().toISOString();
      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: now,
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = (response.data.items || []).filter(
        (e) => e.conferenceData || e.hangoutLink,
      );

      return apiResponse({
        data: {
          type: "meet_list",
          events: events.map((e) => ({
            id: e.id,
            title: e.summary,
            start: e.start,
            end: e.end,
            meetLink:
              e.hangoutLink ||
              e.conferenceData?.entryPoints?.find(
                (ep) => ep.entryPointType === "video",
              )?.uri,
            htmlLink: e.htmlLink,
          })),
        },
      });
    }

    // ─── Extract meet action from message ───
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

    const extracted = await extractMeetAction(
      provider,
      apiKey,
      message,
      context,
      new Date().toISOString(),
    );

    // If clarification is needed, ask user
    if (needsMeetClarification(extracted)) {
      return apiResponse({
        data: {
          type: "meet_clarification",
          meeting: extracted,
          message:
            extracted.clarification_needed ||
            buildMeetFallbackConfirmation(extracted),
        },
      });
    }

    // LIST_MEETINGS doesn't need confirmation
    if (extracted.intent === "LIST_MEETINGS") {
      const refreshToken = await findRefreshTokenByService(user.id, "calendar");
      if (!refreshToken) {
        return apiResponse({
          data: {
            type: "error",
            error: {
              code: "CALENDAR_NOT_CONNECTED",
              message: "請先連結 Google 帳號",
              required_fields: [],
            },
          },
        });
      }

      const calendar = await googleCalendar(refreshToken);
      const now = new Date().toISOString();
      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: now,
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = (response.data.items || []).filter(
        (e) => e.conferenceData || e.hangoutLink,
      );

      return apiResponse({
        data: {
          type: "meet_list",
          events: events.map((e) => ({
            id: e.id,
            title: e.summary,
            start: e.start,
            end: e.end,
            meetLink:
              e.hangoutLink ||
              e.conferenceData?.entryPoints?.find(
                (ep) => ep.entryPointType === "video",
              )?.uri,
            htmlLink: e.htmlLink,
          })),
        },
      });
    }

    // If confirmation is needed (always true by design)
    if (needsMeetConfirmation(extracted)) {
      return apiResponse({
        data: {
          type: "confirm_meet",
          meeting: extracted,
          message: buildMeetFallbackConfirmation(extracted),
        },
      });
    }

    // Fallback: still require confirmation
    return apiResponse({
      data: {
        type: "confirm_meet",
        meeting: extracted,
        message: buildMeetFallbackConfirmation(extracted),
      },
    });
  } catch (error: unknown) {
    console.error("Meet Route Error:", error);

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
      message: (error as Error)?.message || "Meet operation failed",
      status: 500,
    });
  }
}
