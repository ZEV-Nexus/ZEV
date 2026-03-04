import { getMessages } from "@/shared/service/server/message";
import { AIProvider } from "@/shared/store/ai-store";
import {
  streamText,
  ModelMessage,
  type LanguageModel,
  tool,
  stepCountIs,
  generateText,
} from "ai";
import {
  formatMessages,
  type FormattedMessage,
  convertToMs,
  getConversationContextFromMessages,
  AttachmentInfo,
  systemPrompt,
} from "./helper";

import z from "zod";
import { User } from "@/shared/types";

import { translateText } from "@/ai/agents/translation-agent";
import {
  extractTask,
  needsConfirmation,
  buildCalendarEvent,
} from "@/ai/agents/calendar-agent";
import { processAttachments } from "@/ai/agents/attachment-agent";
import {
  extractGmailDraft,
  needsClarification,
  buildGmailFallbackConfirmation,
  buildGmailSendPayload,
} from "@/ai/agents/gmail-agent";
import {
  extractMeetAction,
  needsMeetClarification,
  buildMeetEventPayload,
  buildMeetFallbackConfirmation,
} from "@/ai/agents/meet-agent";
import {
  createGoogleCalendarEvent,
  googleCalendar,
} from "@/shared/lib/google-calendar";
import {
  googleGmail,
  sendGmailMessage,
  listGmailMessages,
  readGmailMessage,
} from "@/shared/lib/google-gmail";

import { findRefreshTokenByService } from "@/shared/service/server/user-oauth-account";
import { IAttachment } from "@/shared/schema/attachment";

export const streamTextOutput = (
  model: LanguageModel,
  provider: AIProvider,
  apiKey: string,
  messages: ModelMessage[],
  attachments: IAttachment,
  toolMentionDirective: string,
  user: Pick<
    User,
    | "id"
    | "provider"
    | "email"
    | "nickname"
    | "username"
    | "bio"
    | "avatar"
    | "emailVerified"
    | "githubUsername"
  >,
  roomId?: string,
) => {
  const now = new Date();
  // Pre-parse attachments for tool access
  const attachmentList: AttachmentInfo[] = Array.isArray(attachments)
    ? attachments
    : [];
  const hasAttachments = attachmentList.length > 0;

  // Build attachment context for system prompt
  const attachmentContext = hasAttachments
    ? `\n\n目前訊息附帶了以下附件：\n${attachmentList
        .map(
          (a: AttachmentInfo, i: number) =>
            `${i + 1}. ${a.filename} (${a.mimeType}, ${(a.size / 1024).toFixed(1)} KB)`,
        )
        .join(
          "\n",
        )}\n如果使用者詢問附件相關問題，請使用 analyze_attachment 工具分析附件。`
    : "";
  return streamText({
    model,
    messages,
    system: systemPrompt(now, attachmentContext, toolMentionDirective),
    tools: {
      // ─── Summarize Chat Tool ───
      summarize_chat: tool({
        description: `從聊天室對話中提取並總結訊息。`,
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
                formattedMsgs = formatMessages(msgs.slice(0, msgs.length - 30));
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

      // ─── Translation Tool → delegates to Translation Agent ───
      translate_text: tool({
        description: `翻譯文字到指定語言。呼叫獨立的 Translation Agent（小模型 + 快取）。`,
        inputSchema: z.object({
          text: z.string().describe("要翻譯的文字"),
          targetLanguage: z
            .string()
            .describe("目標語言，例如 English、日本語、한국어"),
        }),
        execute: async ({ text, targetLanguage }) => {
          try {
            const result = await translateText(
              provider,
              apiKey,
              text,
              targetLanguage,
            );
            return {
              translation: result.translation,
              cached: result.cached,
              targetLanguage,
            };
          } catch (error) {
            console.error("Translate tool error:", error);
            return { error: "翻譯時發生錯誤，請稍後再試。" };
          }
        },
      }),

      // ─── Calendar Tool → delegates to Calendar Agent ───
      create_schedule: tool({
        description: `從使用者訊息中提取行程/排程資訊。呼叫獨立的 Calendar Agent（中階模型）進行智能提取。
    當使用者說到要安排會議、提醒、約定時間、或任何行事曆事件時使用。`,
        inputSchema: z.object({
          user_message: z.string().describe("使用者關於排程的原始訊息"),
        }),
        execute: async ({ user_message }) => {
          try {
            // 取得對話上下文
            let conversationContext = "";
            if (roomId) {
              const recentMsgs = await getMessages(roomId, 20);
              conversationContext = getConversationContextFromMessages(
                formatMessages(recentMsgs),
              );
            }

            // 呼叫 Calendar Agent (extractTask) — 使用中階模型
            const taskExtraction = await extractTask(
              provider,
              apiKey,
              user_message,
              conversationContext,
              now.toISOString(),
            );

            // 判斷是否需要確認
            if (needsConfirmation(taskExtraction)) {
              const missing: string[] = [];
              if (!taskExtraction.date) missing.push("日期");
              if (!taskExtraction.time) missing.push("時間");
              if (!taskExtraction.duration_minutes) missing.push("時長");

              return {
                type: "confirm_schedule",
                task: taskExtraction,
                needsConfirmation: true,
                missingFields: missing,
                message: `📅 Calendar Agent 已提取行程資訊：\n\n**標題**：${taskExtraction.title}\n${taskExtraction.description ? `**說明**：${taskExtraction.description}\n` : ""}**日期**：${taskExtraction.date || "⚠️ 未指定"}\n**時間**：${taskExtraction.time || "⚠️ 未指定"}\n**時長**：${taskExtraction.duration_minutes ? `${taskExtraction.duration_minutes} 分鐘` : "⚠️ 未指定（預設 60 分鐘）"}\n**信心度**：${Math.round(taskExtraction.confidence * 100)}%\n**時間解析**：${taskExtraction.temporal_resolution}\n\n${missing.length > 0 ? `需要補充：${missing.join("、")}` : ""}`,
              };
            }

            // 信心度夠高，建立事件
            const event = buildCalendarEvent(taskExtraction);
            if (!event) {
              return {
                type: "confirm_schedule",
                task: taskExtraction,
                needsConfirmation: true,
                message: "資訊不足，請補充日期。",
              };
            }

            // TODO: 實際呼叫行事曆 API (Google / Apple / Outlook)
            const refreshToken = await findRefreshTokenByService(
              user.id,
              "calendar",
            );
            const calendar = await googleCalendar(refreshToken);

            const calendarEvent = await createGoogleCalendarEvent(
              calendar,
              "primary",
              {
                summary: event.title,
                description: event.description,
                start: {
                  dateTime: new Date(`${event.start}`).toISOString(),
                },
                end: {
                  dateTime: new Date(
                    new Date(event.start).getTime() +
                      event.duration_minutes * 60 * 1000,
                  ).toISOString(),
                },
              },
            );
            return {
              type: "schedule_created",
              task: taskExtraction,
              event,
              message: `✅ 已建立行事曆事件：「${calendarEvent.summary}」於 ${calendarEvent.start}到 ${calendarEvent.end}`,
            };
          } catch (error) {
            console.error("Calendar Agent error:", error);
            return {
              error: "Calendar Agent 處理排程時發生錯誤，請稍後再試。",
            };
          }
        },
      }),

      // ─── Attachment Tool → delegates to Attachment Agent ───
      analyze_attachment: tool({
        description: `分析附件（圖片或文件）。呼叫獨立的 Attachment Agent。
    圖片會使用 Vision Agent（大模型）分析內容；文件會使用 Document Agent（中模型）分析元資料。
    使用此工具時無需指定附件 — 系統會自動取得當前訊息的所有附件。`,
        inputSchema: z.object({
          user_question: z.string().describe("使用者關於附件的問題或指令"),
        }),
        execute: async ({ user_question }) => {
          try {
            if (!hasAttachments) {
              return {
                error: "目前訊息沒有附帶任何附件。",
              };
            }

            // 呼叫 Attachment Agent — 內部自動分流圖片/文件
            const result = await processAttachments(
              provider,
              apiKey,
              attachmentList,
              user_question,
            );

            return {
              type: "attachment_reply",
              responses: result.responses.map((r) => ({
                filename: r.filename,
                category: r.category,
                reply: r.reply,
              })),
              summary: result.summary,
            };
          } catch (error) {
            console.error("Attachment Agent error:", error);
            return {
              error: "Attachment Agent 處理附件時發生錯誤，請稍後再試。",
            };
          }
        },
      }),

      // ─── Gmail Tool → delegates to Gmail Agent ───
      gmail_action: tool({
        description: `處理 Gmail 相關操作：撰寫郵件、回覆郵件、查看收件匣、讀取郵件。
    呼叫獨立的 Gmail Agent（中階模型）進行意圖解析。
    寄送郵件前必須經過使用者確認。`,
        inputSchema: z.object({
          user_message: z.string().describe("使用者關於郵件的原始訊息"),
          action_type: z
            .enum(["draft", "list", "read", "send_confirmed"])
            .describe(
              "操作類型：draft=撰寫/回覆草稿、list=列出收件匣、read=讀取郵件、send_confirmed=使用者已確認寄送",
            ),
          message_id: z
            .string()
            .optional()
            .describe("郵件 ID（讀取郵件或確認寄送時使用）"),
          confirmed_draft: z
            .object({
              to: z.string(),
              subject: z.string(),
              body: z.string(),
              threadId: z.string().optional(),
            })
            .optional()
            .describe("使用者已確認的郵件草稿（send_confirmed 時使用）"),
        }),
        execute: async ({
          user_message,
          action_type,
          message_id,
          confirmed_draft,
        }) => {
          try {
            const refreshToken = await findRefreshTokenByService(
              user.id,
              "gmail",
            );

            if (!refreshToken) {
              return {
                error: "尚未連結 Google Gmail 帳號，請前往設定頁面連結 Gmail。",
              };
            }

            const gmail = await googleGmail(refreshToken);

            // ─── List inbox ───
            if (action_type === "list") {
              const messages = await listGmailMessages(gmail, 10);
              return {
                type: "gmail_messages",
                messages: messages.map((m) => ({
                  id: m.id,
                  from: m.from,
                  subject: m.subject,
                  date: m.date,
                  snippet: m.snippet,
                })),
                message: `📬 以下是最近的郵件：\n${messages
                  .map(
                    (m, i) =>
                      `${i + 1}. **${m.subject || "(無主旨)"}** — ${m.from}\n   ${m.snippet}`,
                  )
                  .join("\n\n")}`,
              };
            }

            // ─── Read specific message ───
            if (action_type === "read" && message_id) {
              const msg = await readGmailMessage(gmail, message_id);
              return {
                type: "gmail_message_detail",
                emailData: {
                  id: msg.id,
                  from: msg.from,
                  to: msg.to,
                  subject: msg.subject,
                  date: msg.date,
                  body: msg.body,
                  threadId: msg.threadId,
                  messageId: msg.messageId,
                },
                message: `📧 **${msg.subject}**\n\n**寄件者**：${msg.from}\n**日期**：${msg.date}\n\n${msg.body}`,
              };
            }

            // ─── Send confirmed draft ───
            if (action_type === "send_confirmed" && confirmed_draft) {
              const result = await sendGmailMessage(gmail, confirmed_draft);
              return {
                type: "gmail_sent",
                messageId: result.id,
                threadId: result.threadId,
                message: `✅ 郵件已成功寄送給 ${confirmed_draft.to}`,
              };
            }

            // ─── Draft: Extract intent with Gmail Agent ───
            let conversationContext = "";
            if (roomId) {
              const recentMsgs = await getMessages(roomId, 20);
              conversationContext = getConversationContextFromMessages(
                formatMessages(recentMsgs),
              );
            }

            const draft = await extractGmailDraft(
              provider,
              apiKey,
              user_message,
              conversationContext,
            );

            // If clarification needed
            if (needsClarification(draft)) {
              return {
                type: "gmail_clarification",
                draft,
                message:
                  draft.clarification_needed ||
                  "需要更多資訊才能撰寫郵件，請補充。",
              };
            }

            // For LIST_MESSAGES / READ_MESSAGE actions detected by agent
            if (draft.action === "LIST_MESSAGES") {
              const messages = await listGmailMessages(gmail, 10);
              return {
                type: "gmail_messages",
                messages: messages.map((m) => ({
                  id: m.id,
                  from: m.from,
                  subject: m.subject,
                  date: m.date,
                  snippet: m.snippet,
                })),
                message: `📬 以下是最近的郵件：\n${messages
                  .map(
                    (m, i) =>
                      `${i + 1}. **${m.subject || "(無主旨)"}** — ${m.from}\n   ${m.snippet}`,
                  )
                  .join("\n\n")}`,
              };
            }

            if (draft.action === "READ_MESSAGE") {
              return {
                type: "gmail_clarification",
                message: "請指定要讀取哪封郵件。你可以先說「查看收件匣」。",
              };
            }

            // Draft/Reply: return for confirmation
            const payload = buildGmailSendPayload(draft);
            return {
              type: "confirm_gmail",
              draft: {
                action: draft.action,
                to: draft.to,
                subject: draft.subject,
                body: draft.body,
                confidence: draft.confidence,
              },
              canSend: !!payload,
              message: buildGmailFallbackConfirmation(draft),
            };
          } catch (error) {
            console.error("Gmail Agent error:", error);
            return {
              error: "Gmail Agent 處理郵件時發生錯誤，請稍後再試。",
            };
          }
        },
      }),
      // ─── Meet Tool → delegates to Meet Agent ───
      meet_action: tool({
        description: `處理 Google Meet 會議相關操作：建立會議、修改會議、取消會議、查詢會議列表。
    呼叫獨立的 Meet Agent（中階模型）進行意圖解析。
    建立會議時會自動產生 Google Meet 連結。
    所有操作都需經過使用者確認。`,
        inputSchema: z.object({
          user_message: z.string().describe("使用者關於會議的原始訊息"),
          action_type: z
            .enum(["create", "list", "confirm_create"])
            .describe(
              "操作類型：create=建立會議、list=查詢會議列表、confirm_create=使用者已確認建立",
            ),
          confirmed_meeting: z
            .object({
              title: z.string(),
              start_time: z.string(),
              end_time: z.string(),
              attendees: z.array(z.string()).optional(),
            })
            .optional()
            .describe("使用者已確認的會議資訊（confirm_create 時使用）"),
        }),
        execute: async ({ user_message, action_type, confirmed_meeting }) => {
          try {
            const refreshToken = await findRefreshTokenByService(
              user.id,
              "calendar",
            );

            if (!refreshToken) {
              return {
                error: "尚未連結 Google 帳號，請前往設定頁面連結 Google 帳號。",
              };
            }

            const calendar = await googleCalendar(refreshToken);

            // ─── List meetings ───
            if (action_type === "list") {
              const nowISO = new Date().toISOString();
              const response = await calendar.events.list({
                calendarId: "primary",
                timeMin: nowISO,
                maxResults: 10,
                singleEvents: true,
                orderBy: "startTime",
              });

              const events = (response.data.items || []).filter(
                (e) => e.conferenceData || e.hangoutLink,
              );

              if (events.length === 0) {
                return {
                  type: "meet_list",
                  message: "目前沒有即將到來的 Google Meet 會議。",
                };
              }

              return {
                type: "meet_list",
                events: events.map((e) => ({
                  id: e.id,
                  title: e.summary,
                  start: e.start?.dateTime || e.start?.date,
                  end: e.end?.dateTime || e.end?.date,
                  meetLink:
                    e.hangoutLink ||
                    e.conferenceData?.entryPoints?.find(
                      (ep) => ep.entryPointType === "video",
                    )?.uri,
                })),
                message: `📋 即將到來的 Meet 會議：\n${events
                  .map(
                    (e, i) =>
                      `${i + 1}. **${e.summary || "(無標題)"}**\n   🕐 ${e.start?.dateTime || e.start?.date}${e.hangoutLink ? `\n   🔗 ${e.hangoutLink}` : ""}`,
                  )
                  .join("\n\n")}`,
              };
            }

            // ─── Confirm create meeting ───
            if (action_type === "confirm_create" && confirmed_meeting) {
              const event = await createGoogleCalendarEvent(
                calendar,
                "primary",
                {
                  summary: confirmed_meeting.title,
                  start: { dateTime: confirmed_meeting.start_time },
                  end: { dateTime: confirmed_meeting.end_time },
                  attendees: (confirmed_meeting.attendees || []).map(
                    (email) => ({ email }),
                  ),
                  conferenceData: {
                    createRequest: {
                      requestId: `meet-${Date.now()}`,
                      conferenceSolutionKey: { type: "hangoutsMeet" },
                    },
                  },
                },
              );

              const meetLink =
                event.conferenceData?.entryPoints?.find(
                  (e) => e.entryPointType === "video",
                )?.uri || event.hangoutLink;

              return {
                type: "meet_created",
                event: {
                  id: event.id,
                  title: event.summary,
                  start: event.start?.dateTime,
                  end: event.end?.dateTime,
                  meetLink,
                  htmlLink: event.htmlLink,
                },
                message: `✅ 已建立會議：「${event.summary}」\n🕐 ${event.start?.dateTime} ~ ${event.end?.dateTime}${meetLink ? `\n🔗 Meet 連結：${meetLink}` : ""}`,
              };
            }

            // ─── Create: Extract intent with Meet Agent ───
            let conversationContext = "";
            if (roomId) {
              const recentMsgs = await getMessages(roomId, 20);
              conversationContext = getConversationContextFromMessages(
                formatMessages(recentMsgs),
              );
            }

            const extraction = await extractMeetAction(
              provider,
              apiKey,
              user_message,
              conversationContext,
              now.toISOString(),
            );

            // If clarification needed
            if (needsMeetClarification(extraction)) {
              return {
                type: "meet_clarification",
                meeting: extraction,
                message:
                  extraction.clarification_needed ||
                  buildMeetFallbackConfirmation(extraction),
              };
            }

            // LIST_MEETINGS detected by agent
            if (extraction.intent === "LIST_MEETINGS") {
              const nowISO = new Date().toISOString();
              const response = await calendar.events.list({
                calendarId: "primary",
                timeMin: nowISO,
                maxResults: 10,
                singleEvents: true,
                orderBy: "startTime",
              });

              const events = (response.data.items || []).filter(
                (e) => e.conferenceData || e.hangoutLink,
              );

              return {
                type: "meet_list",
                events: events.map((e) => ({
                  id: e.id,
                  title: e.summary,
                  start: e.start?.dateTime || e.start?.date,
                  end: e.end?.dateTime || e.end?.date,
                  meetLink:
                    e.hangoutLink ||
                    e.conferenceData?.entryPoints?.find(
                      (ep) => ep.entryPointType === "video",
                    )?.uri,
                })),
                message:
                  events.length === 0
                    ? "目前沒有即將到來的 Google Meet 會議。"
                    : `📋 即將到來的 Meet 會議：\n${events
                        .map(
                          (e, i) =>
                            `${i + 1}. **${e.summary || "(無標題)"}**\n   🕐 ${e.start?.dateTime || e.start?.date}`,
                        )
                        .join("\n\n")}`,
              };
            }

            // Return for confirmation
            const payload = buildMeetEventPayload(extraction);
            return {
              type: "confirm_meet",
              meeting: {
                intent: extraction.intent,
                title: extraction.title,
                start_time: extraction.start_time,
                end_time: extraction.end_time,
                attendees: extraction.attendees,
                confidence: extraction.confidence,
              },
              canCreate: !!payload,
              message: buildMeetFallbackConfirmation(extraction),
            };
          } catch (error) {
            console.error("Meet Agent error:", error);
            return {
              error: "Meet Agent 處理會議時發生錯誤，請稍後再試。",
            };
          }
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });
};

export const generateTextResponse = async (
  model: LanguageModel,
  user: Pick<
    User,
    | "id"
    | "provider"
    | "email"
    | "nickname"
    | "username"
    | "bio"
    | "avatar"
    | "emailVerified"
    | "githubUsername"
  >,
  prompt: string,
  provider: AIProvider,
  apiKey: string,

  toolMentionDirective: string,
) => {
  const now = new Date();
  return await generateText({
    model,
    prompt,
    system: systemPrompt(new Date(), "", toolMentionDirective),
    tools: {
      // ─── Translation Tool → delegates to Translation Agent ───
      translate_text: tool({
        description: `翻譯文字到指定語言。呼叫獨立的 Translation Agent（小模型 + 快取）。`,
        inputSchema: z.object({
          text: z.string().describe("要翻譯的文字"),
          targetLanguage: z
            .string()
            .describe("目標語言，例如 English、日本語、한국어"),
        }),
        execute: async ({ text, targetLanguage }) => {
          try {
            const result = await translateText(
              provider,
              apiKey,
              text,
              targetLanguage,
            );
            return {
              translation: result.translation,
              cached: result.cached,
              targetLanguage,
            };
          } catch (error) {
            console.error("Translate tool error:", error);
            return { error: "翻譯時發生錯誤，請稍後再試。" };
          }
        },
      }),

      // ─── Calendar Tool → delegates to Calendar Agent ───
      create_schedule: tool({
        description: `從使用者訊息中提取行程/排程資訊。呼叫獨立的 Calendar Agent（中階模型）進行智能提取。
    當使用者說到要安排會議、提醒、約定時間、或任何行事曆事件時使用。`,
        inputSchema: z.object({
          user_message: z.string().describe("使用者關於排程的原始訊息"),
        }),
        execute: async ({ user_message }) => {
          try {
            // 取得對話上下文

            // 呼叫 Calendar Agent (extractTask) — 使用中階模型
            const taskExtraction = await extractTask(
              provider,
              apiKey,
              user_message,
              now.toISOString(),
            );

            // 判斷是否需要確認
            if (needsConfirmation(taskExtraction)) {
              const missing: string[] = [];
              if (!taskExtraction.date) missing.push("日期");
              if (!taskExtraction.time) missing.push("時間");
              if (!taskExtraction.duration_minutes) missing.push("時長");

              return {
                type: "confirm_schedule",
                task: taskExtraction,
                needsConfirmation: true,
                missingFields: missing,
                message: `📅 Calendar Agent 已提取行程資訊：\n\n**標題**：${taskExtraction.title}\n${taskExtraction.description ? `**說明**：${taskExtraction.description}\n` : ""}**日期**：${taskExtraction.date || "⚠️ 未指定"}\n**時間**：${taskExtraction.time || "⚠️ 未指定"}\n**時長**：${taskExtraction.duration_minutes ? `${taskExtraction.duration_minutes} 分鐘` : "⚠️ 未指定（預設 60 分鐘）"}\n**信心度**：${Math.round(taskExtraction.confidence * 100)}%\n**時間解析**：${taskExtraction.temporal_resolution}\n\n${missing.length > 0 ? `需要補充：${missing.join("、")}` : ""}`,
              };
            }

            // 信心度夠高，建立事件
            const event = buildCalendarEvent(taskExtraction);
            if (!event) {
              return {
                type: "confirm_schedule",
                task: taskExtraction,
                needsConfirmation: true,
                message: "資訊不足，請補充日期。",
              };
            }

            // TODO: 實際呼叫行事曆 API (Google / Apple / Outlook)
            const refreshToken = await findRefreshTokenByService(
              user.id,
              "calendar",
            );
            const calendar = await googleCalendar(refreshToken);

            const calendarEvent = await createGoogleCalendarEvent(
              calendar,
              "primary",
              {
                summary: event.title,
                description: event.description,
                start: {
                  dateTime: new Date(`${event.start}`).toISOString(),
                },
                end: {
                  dateTime: new Date(
                    new Date(event.start).getTime() +
                      event.duration_minutes * 60 * 1000,
                  ).toISOString(),
                },
              },
            );
            return {
              type: "schedule_created",
              task: taskExtraction,
              event,
              message: `✅ 已建立行事曆事件：「${calendarEvent.summary}」於 ${calendarEvent.start}到 ${calendarEvent.end}`,
            };
          } catch (error) {
            console.error("Calendar Agent error:", error);
            return {
              error: "Calendar Agent 處理排程時發生錯誤，請稍後再試。",
            };
          }
        },
      }),

      // ─── Gmail Tool → delegates to Gmail Agent ───
      gmail_action: tool({
        description: `處理 Gmail 相關操作：撰寫郵件、回覆郵件、查看收件匣、讀取郵件。
    呼叫獨立的 Gmail Agent（中階模型）進行意圖解析。
    寄送郵件前必須經過使用者確認。`,
        inputSchema: z.object({
          user_message: z.string().describe("使用者關於郵件的原始訊息"),
          action_type: z
            .enum(["draft", "list", "read", "send_confirmed"])
            .describe(
              "操作類型：draft=撰寫/回覆草稿、list=列出收件匣、read=讀取郵件、send_confirmed=使用者已確認寄送",
            ),
          message_id: z
            .string()
            .optional()
            .describe("郵件 ID（讀取郵件或確認寄送時使用）"),
          confirmed_draft: z
            .object({
              to: z.string(),
              subject: z.string(),
              body: z.string(),
              threadId: z.string().optional(),
            })
            .optional()
            .describe("使用者已確認的郵件草稿（send_confirmed 時使用）"),
        }),
        execute: async ({
          user_message,
          action_type,
          message_id,
          confirmed_draft,
        }) => {
          try {
            const refreshToken = await findRefreshTokenByService(
              user.id,
              "gmail",
            );

            if (!refreshToken) {
              return {
                error: "尚未連結 Google Gmail 帳號，請前往設定頁面連結 Gmail。",
              };
            }

            const gmail = await googleGmail(refreshToken);

            // ─── List inbox ───
            if (action_type === "list") {
              const messages = await listGmailMessages(gmail, 10);
              return {
                type: "gmail_messages",
                messages: messages.map((m) => ({
                  id: m.id,
                  from: m.from,
                  subject: m.subject,
                  date: m.date,
                  snippet: m.snippet,
                })),
                message: `📬 以下是最近的郵件：\n${messages
                  .map(
                    (m, i) =>
                      `${i + 1}. **${m.subject || "(無主旨)"}** — ${m.from}\n   ${m.snippet}`,
                  )
                  .join("\n\n")}`,
              };
            }

            // ─── Read specific message ───
            if (action_type === "read" && message_id) {
              const msg = await readGmailMessage(gmail, message_id);
              return {
                type: "gmail_message_detail",
                emailData: {
                  id: msg.id,
                  from: msg.from,
                  to: msg.to,
                  subject: msg.subject,
                  date: msg.date,
                  body: msg.body,
                  threadId: msg.threadId,
                  messageId: msg.messageId,
                },
                message: `📧 **${msg.subject}**\n\n**寄件者**：${msg.from}\n**日期**：${msg.date}\n\n${msg.body}`,
              };
            }

            // ─── Send confirmed draft ───
            if (action_type === "send_confirmed" && confirmed_draft) {
              const result = await sendGmailMessage(gmail, confirmed_draft);
              return {
                type: "gmail_sent",
                messageId: result.id,
                threadId: result.threadId,
                message: `✅ 郵件已成功寄送給 ${confirmed_draft.to}`,
              };
            }

            // ─── Draft: Extract intent with Gmail Agent ───

            const draft = await extractGmailDraft(
              provider,
              apiKey,
              user_message,
            );

            // If clarification needed
            if (needsClarification(draft)) {
              return {
                type: "gmail_clarification",
                draft,
                message:
                  draft.clarification_needed ||
                  "需要更多資訊才能撰寫郵件，請補充。",
              };
            }

            // For LIST_MESSAGES / READ_MESSAGE actions detected by agent
            if (draft.action === "LIST_MESSAGES") {
              const messages = await listGmailMessages(gmail, 10);
              return {
                type: "gmail_messages",
                messages: messages.map((m) => ({
                  id: m.id,
                  from: m.from,
                  subject: m.subject,
                  date: m.date,
                  snippet: m.snippet,
                })),
                message: `📬 以下是最近的郵件：\n${messages
                  .map(
                    (m, i) =>
                      `${i + 1}. **${m.subject || "(無主旨)"}** — ${m.from}\n   ${m.snippet}`,
                  )
                  .join("\n\n")}`,
              };
            }

            if (draft.action === "READ_MESSAGE") {
              return {
                type: "gmail_clarification",
                message: "請指定要讀取哪封郵件。你可以先說「查看收件匣」。",
              };
            }

            // Draft/Reply: return for confirmation
            const payload = buildGmailSendPayload(draft);
            return {
              type: "confirm_gmail",
              draft: {
                action: draft.action,
                to: draft.to,
                subject: draft.subject,
                body: draft.body,
                confidence: draft.confidence,
              },
              canSend: !!payload,
              message: buildGmailFallbackConfirmation(draft),
            };
          } catch (error) {
            console.error("Gmail Agent error:", error);
            return {
              error: "Gmail Agent 處理郵件時發生錯誤，請稍後再試。",
            };
          }
        },
      }),
      // ─── Meet Tool → delegates to Meet Agent ───
      meet_action: tool({
        description: `處理 Google Meet 會議相關操作：建立會議、修改會議、取消會議、查詢會議列表。
    呼叫獨立的 Meet Agent（中階模型）進行意圖解析。
    建立會議時會自動產生 Google Meet 連結。
    所有操作都需經過使用者確認。`,
        inputSchema: z.object({
          user_message: z.string().describe("使用者關於會議的原始訊息"),
          action_type: z
            .enum(["create", "list", "confirm_create"])
            .describe(
              "操作類型：create=建立會議、list=查詢會議列表、confirm_create=使用者已確認建立",
            ),
          confirmed_meeting: z
            .object({
              title: z.string(),
              start_time: z.string(),
              end_time: z.string(),
              attendees: z.array(z.string()).optional(),
            })
            .optional()
            .describe("使用者已確認的會議資訊（confirm_create 時使用）"),
        }),
        execute: async ({ user_message, action_type, confirmed_meeting }) => {
          try {
            const refreshToken = await findRefreshTokenByService(
              user.id,
              "calendar",
            );

            if (!refreshToken) {
              return {
                error: "尚未連結 Google 帳號，請前往設定頁面連結 Google 帳號。",
              };
            }

            const calendar = await googleCalendar(refreshToken);

            // ─── List meetings ───
            if (action_type === "list") {
              const nowISO = new Date().toISOString();
              const response = await calendar.events.list({
                calendarId: "primary",
                timeMin: nowISO,
                maxResults: 10,
                singleEvents: true,
                orderBy: "startTime",
              });

              const events = (response.data.items || []).filter(
                (e) => e.conferenceData || e.hangoutLink,
              );

              if (events.length === 0) {
                return {
                  type: "meet_list",
                  message: "目前沒有即將到來的 Google Meet 會議。",
                };
              }

              return {
                type: "meet_list",
                events: events.map((e) => ({
                  id: e.id,
                  title: e.summary,
                  start: e.start?.dateTime || e.start?.date,
                  end: e.end?.dateTime || e.end?.date,
                  meetLink:
                    e.hangoutLink ||
                    e.conferenceData?.entryPoints?.find(
                      (ep) => ep.entryPointType === "video",
                    )?.uri,
                })),
                message: `📋 即將到來的 Meet 會議：\n${events
                  .map(
                    (e, i) =>
                      `${i + 1}. **${e.summary || "(無標題)"}**\n   🕐 ${e.start?.dateTime || e.start?.date}${e.hangoutLink ? `\n   🔗 ${e.hangoutLink}` : ""}`,
                  )
                  .join("\n\n")}`,
              };
            }

            // ─── Confirm create meeting ───
            if (action_type === "confirm_create" && confirmed_meeting) {
              const event = await createGoogleCalendarEvent(
                calendar,
                "primary",
                {
                  summary: confirmed_meeting.title,
                  start: { dateTime: confirmed_meeting.start_time },
                  end: { dateTime: confirmed_meeting.end_time },
                  attendees: (confirmed_meeting.attendees || []).map(
                    (email) => ({ email }),
                  ),
                  conferenceData: {
                    createRequest: {
                      requestId: `meet-${Date.now()}`,
                      conferenceSolutionKey: { type: "hangoutsMeet" },
                    },
                  },
                },
              );

              const meetLink =
                event.conferenceData?.entryPoints?.find(
                  (e) => e.entryPointType === "video",
                )?.uri || event.hangoutLink;

              return {
                type: "meet_created",
                event: {
                  id: event.id,
                  title: event.summary,
                  start: event.start?.dateTime,
                  end: event.end?.dateTime,
                  meetLink,
                  htmlLink: event.htmlLink,
                },
                message: `✅ 已建立會議：「${event.summary}」\n🕐 ${event.start?.dateTime} ~ ${event.end?.dateTime}${meetLink ? `\n🔗 Meet 連結：${meetLink}` : ""}`,
              };
            }

            // ─── Create: Extract intent with Meet Agent ───

            const extraction = await extractMeetAction(
              provider,
              apiKey,
              user_message,

              now.toISOString(),
            );

            // If clarification needed
            if (needsMeetClarification(extraction)) {
              return {
                type: "meet_clarification",
                meeting: extraction,
                message:
                  extraction.clarification_needed ||
                  buildMeetFallbackConfirmation(extraction),
              };
            }

            // LIST_MEETINGS detected by agent
            if (extraction.intent === "LIST_MEETINGS") {
              const nowISO = new Date().toISOString();
              const response = await calendar.events.list({
                calendarId: "primary",
                timeMin: nowISO,
                maxResults: 10,
                singleEvents: true,
                orderBy: "startTime",
              });

              const events = (response.data.items || []).filter(
                (e) => e.conferenceData || e.hangoutLink,
              );

              return {
                type: "meet_list",
                events: events.map((e) => ({
                  id: e.id,
                  title: e.summary,
                  start: e.start?.dateTime || e.start?.date,
                  end: e.end?.dateTime || e.end?.date,
                  meetLink:
                    e.hangoutLink ||
                    e.conferenceData?.entryPoints?.find(
                      (ep) => ep.entryPointType === "video",
                    )?.uri,
                })),
                message:
                  events.length === 0
                    ? "目前沒有即將到來的 Google Meet 會議。"
                    : `📋 即將到來的 Meet 會議：\n${events
                        .map(
                          (e, i) =>
                            `${i + 1}. **${e.summary || "(無標題)"}**\n   🕐 ${e.start?.dateTime || e.start?.date}`,
                        )
                        .join("\n\n")}`,
              };
            }

            // Return for confirmation
            const payload = buildMeetEventPayload(extraction);
            return {
              type: "confirm_meet",
              meeting: {
                intent: extraction.intent,
                title: extraction.title,
                start_time: extraction.start_time,
                end_time: extraction.end_time,
                attendees: extraction.attendees,
                confidence: extraction.confidence,
              },
              canCreate: !!payload,
              message: buildMeetFallbackConfirmation(extraction),
            };
          } catch (error) {
            console.error("Meet Agent error:", error);
            return {
              error: "Meet Agent 處理會議時發生錯誤，請稍後再試。",
            };
          }
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });
};
