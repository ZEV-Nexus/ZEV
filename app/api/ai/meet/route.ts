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
  googleMeet,
  createMeetSpace,
  listConferenceRecords,
} from "@/shared/lib/google-meet";
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
                message: "會議標題資訊不足，無法建立會議",
                required_fields: [...(!meeting.title ? ["title"] : [])],
              },
            },
          });
        }

        // Get Meet OAuth token
        const refreshToken = await findRefreshTokenByService(user.id, "meet");
        if (!refreshToken) {
          return apiResponse({
            data: {
              type: "error",
              error: {
                code: "MEET_NOT_CONNECTED",
                message: "請先連結 Google Meet 帳號",
                required_fields: [],
              },
            },
          });
        }

        const meet = await googleMeet(refreshToken);

        // Create meeting space with Google Meet API
        const space = await createMeetSpace(meet);

        const hasTime = payload.start_time && payload.end_time;
        return apiResponse({
          data: {
            type: "meet_created",
            event: {
              title: payload.title,
              start: payload.start_time || null,
              end: payload.end_time || null,
              meetLink: space.meetingUri,
              meetingCode: space.meetingCode,
              spaceName: space.name,
            },
            message: `✅ 已建立會議：「${payload.title}」${hasTime ? `\n🕐 ${payload.start_time} ~ ${payload.end_time}` : ""}${space.meetingUri ? `\n🔗 Meet 連結：${space.meetingUri}` : ""}`,
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
      const refreshToken = await findRefreshTokenByService(user.id, "meet");
      if (!refreshToken) {
        return apiResponse({
          data: {
            type: "error",
            error: {
              code: "MEET_NOT_CONNECTED",
              message: "請先連結 Google Meet 帳號",
              required_fields: [],
            },
          },
        });
      }

      const meet = await googleMeet(refreshToken);
      const records = await listConferenceRecords(meet, 10);

      return apiResponse({
        data: {
          type: "meet_list",
          records: records.map((r) => ({
            name: r.name,
            startTime: r.startTime,
            endTime: r.endTime,
            space: r.space,
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
      const refreshToken = await findRefreshTokenByService(user.id, "meet");
      if (!refreshToken) {
        return apiResponse({
          data: {
            type: "error",
            error: {
              code: "MEET_NOT_CONNECTED",
              message: "請先連結 Google Meet 帳號",
              required_fields: [],
            },
          },
        });
      }

      const meet = await googleMeet(refreshToken);
      const records = await listConferenceRecords(meet, 10);

      return apiResponse({
        data: {
          type: "meet_list",
          records: records.map((r) => ({
            name: r.name,
            startTime: r.startTime,
            endTime: r.endTime,
            space: r.space,
          })),
        },
      });
    }

    // 信心度 100% → 直接建立會議
    if (extracted.confidence === 1) {
      const refreshToken = await findRefreshTokenByService(user.id, "meet");
      if (!refreshToken) {
        return apiResponse({
          data: {
            type: "error",
            error: {
              code: "MEET_NOT_CONNECTED",
              message: "請先連結 Google Meet 帳號",
              required_fields: [],
            },
          },
        });
      }

      const meet = await googleMeet(refreshToken);
      const space = await createMeetSpace(meet);

      const hasTime = extracted.start_time && extracted.end_time;
      return apiResponse({
        data: {
          type: "meet_created",
          event: {
            title: extracted.title,
            start: extracted.start_time || null,
            end: extracted.end_time || null,
            meetLink: space.meetingUri,
            meetingCode: space.meetingCode,
            spaceName: space.name,
          },
          message: `✅ 已建立會議：「${extracted.title}」${hasTime ? `\n🕐 ${extracted.start_time} ~ ${extracted.end_time}` : ""}${space.meetingUri ? `\n🔗 Meet 連結：${space.meetingUri}` : ""}`,
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
