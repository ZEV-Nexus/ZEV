import { IAttachment } from "@/shared/schema/attachment";
import { Message } from "@/shared/types";
import { fetchApi } from "./fetch";

export async function fetchMessages(
  roomId: string,
  limit: number = 50,
  before?: string,
) {
  const params = new URLSearchParams({ roomId, limit: String(limit) });
  if (before) params.set("before", before);

  const response = await fetchApi<Message[]>(
    `chat/messages?${params.toString()}`,
  );
  return response.data;
}

export async function sendMessage(
  memberId: string,
  roomId: string,
  content?: string,
  attachments?: IAttachment[],
  replyTo?: string,
) {
  const response = await fetchApi<Message>("chat/messages/send", {
    method: "POST",
    body: JSON.stringify({
      memberId,
      roomId,
      content,
      attachments,
      replyTo,
    }),
  });
  return response.data;
}

export async function editMessageApi(messageId: string, content: string) {
  const response = await fetchApi<Message>("chat/messages/edit", {
    method: "PATCH",
    body: JSON.stringify({ messageId, content }),
  });
  return response.data;
}

export async function deleteMessageApi(messageId: string) {
  const response = await fetchApi<Message>("chat/messages/delete", {
    method: "DELETE",
    body: JSON.stringify({ messageId }),
  });
  return response.data;
}

export async function getUnreadCount(roomId: string, userId: string) {
  const response = await fetchApi<number>(
    `chat/messages/unread?roomId=${roomId}&userId=${userId}`,
  );
  return response.data;
}

export async function markAsRead(roomId: string, messageId?: string) {
  const response = await fetchApi("chat/read", {
    method: "POST",
    body: JSON.stringify({ roomId, messageId }),
  });
  return response.data;
}
