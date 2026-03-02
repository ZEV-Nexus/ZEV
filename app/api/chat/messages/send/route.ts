import { getCurrentUser, hasAccessToRoom } from "@/shared/service/server/auth";
import { sendMessage } from "@/shared/service/server/message";
import { apiResponse } from "@/shared/service/server/response";
import { getMembersByRoomId } from "@/shared/service/server/member";
import { publishUserNotification } from "@/shared/lib/server-ably";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
    }

    const { roomId, memberId, content, attachments, replyTo } =
      await req.json();
    if (!roomId || (!content && !attachments?.length)) {
      return apiResponse({ ok: false, message: "Bad Request", status: 400 });
    }

    const hasAccess = await hasAccessToRoom(user.id, roomId);
    if (!hasAccess) {
      return apiResponse({ ok: false, message: "Forbidden", status: 403 });
    }

    const message = await sendMessage(
      memberId,
      roomId,
      content,
      attachments,
      replyTo,
    );

    // Broadcast to room members for sidebar update
    const members = await getMembersByRoomId(roomId);
    const notifyPromises = members
      .filter((m) => m.user?.id && m.user.id !== user.id)
      .map((m) =>
        publishUserNotification(m.user.id, "chat-message", {
          roomId,
          message,
        }),
      );
    await Promise.allSettled(notifyPromises);

    return apiResponse({ data: message });
  } catch (error) {
    console.error("Failed to send message:", error);
    return apiResponse({
      ok: false,
      message: "Internal Server Error",
      status: 500,
    });
  }
}
