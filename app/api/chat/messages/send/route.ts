import { getCurrentUser } from "@/shared/service/server/auth";
import { sendMessage } from "@/shared/service/server/message";
import { apiResponse } from "@/shared/service/server/response";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { roomId, memberId, content, attachments, replyTo } =
      await req.json();
    if (!roomId || (!content && !attachments?.length)) {
      return apiResponse({ ok: false, message: "Bad Request", status: 400 });
    }
    const message = await sendMessage(
      memberId,
      roomId,
      content,
      attachments,
      replyTo,
    );
    return apiResponse({ data: message });
  } catch (error) {
    return apiResponse({
      ok: false,
      message: "Internal Server Error",
      status: 500,
    });
  }
}
