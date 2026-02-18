import { getCurrentUser } from "@/shared/service/server/auth";
import { getUnreadCount } from "@/shared/service/server/message";
import { apiResponse } from "@/shared/service/server/response";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const userId = searchParams.get("userId");
  if (!roomId || !userId) {
    return apiResponse({
      ok: false,
      message: "Bad Request",
      status: 400,
    });
  }
  const user = await getCurrentUser();
  if (!user) {
    return apiResponse({
      ok: false,
      message: "Unauthorized",
      status: 401,
    });
  }
  const unreadCount = await getUnreadCount(roomId, user.id);
  return apiResponse({ data: unreadCount });
}
