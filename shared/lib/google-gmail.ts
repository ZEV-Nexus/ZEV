import { oauthClient } from "./google-auth";
import { google, gmail_v1 } from "googleapis";

// ─── Gmail Client Factory ───

export async function googleGmail(
  refreshToken: string,
): Promise<gmail_v1.Gmail> {
  oauthClient.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: "v1", auth: oauthClient });
  return gmail;
}
function encodeSubject(subject: string) {
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}
// ─── Helper: Build RFC 2822 raw message ───

function buildRawMessage({
  to,
  subject,
  body,
  from,
  inReplyTo,
  references,
}: {
  to: string;
  subject: string;
  body: string;
  from?: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const lines: string[] = [];
  if (from) lines.push(`From: ${from}`);
  lines.push(`To: ${to}`);
  lines.push(`Subject: ${encodeSubject(subject)}`);
  lines.push(`Content-Type: text/plain; charset="UTF-8"`);
  if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
  if (references) lines.push(`References: ${references}`);
  lines.push("");
  lines.push(body);

  const raw = lines.join("\r\n");
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ─── Send Email ───

export async function sendGmailMessage(
  gmail: gmail_v1.Gmail,
  {
    to,
    subject,
    body,
    threadId,
  }: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
  },
) {
  const raw = buildRawMessage({ to, subject, body });

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      ...(threadId ? { threadId } : {}),
    },
  });
  console.log("Gmail send response:", response.data);
  return response.data;
}

// ─── List Messages ───

export async function listGmailMessages(
  gmail: gmail_v1.Gmail,
  maxResults: number = 10,
) {
  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    labelIds: ["INBOX"],
  });

  if (!response.data.messages) return [];

  const messages = await Promise.all(
    response.data.messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });

      const headers = detail.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name === name)?.value || "";

      return {
        id: detail.data.id,
        threadId: detail.data.threadId,
        snippet: detail.data.snippet,
        from: getHeader("From"),
        to: getHeader("To"),
        subject: getHeader("Subject"),
        date: getHeader("Date"),
        labelIds: detail.data.labelIds,
      };
    }),
  );

  return messages;
}

// ─── Read Single Message ───

export async function readGmailMessage(
  gmail: gmail_v1.Gmail,
  messageId: string,
) {
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const headers = response.data.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name === name)?.value || "";

  // Extract plain text body
  let body = "";
  const payload = response.data.payload;

  if (payload?.body?.data) {
    body = Buffer.from(payload.body.data, "base64").toString("utf-8");
  } else if (payload?.parts) {
    const textPart = payload.parts.find(
      (p) => p.mimeType === "text/plain" && p.body?.data,
    );
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
    }
  }

  return {
    id: response.data.id,
    threadId: response.data.threadId,
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
    body,
    snippet: response.data.snippet,
    labelIds: response.data.labelIds,
    messageId: getHeader("Message-ID"),
  };
}
