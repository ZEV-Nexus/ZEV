import { getCurrentUser } from "@/shared/service/server/auth";
import { getMessages } from "@/shared/service/server/message";
import { apiResponse } from "@/shared/service/server/response";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before") || undefined;

    if (!roomId) {
      return apiResponse({
        ok: false,
        message: "roomId is required",
        status: 400,
      });
    }

    const messages = await getMessages(roomId, limit, before);
    return apiResponse({ data: messages });
  } catch (error) {
    return apiResponse({
      ok: false,
      message: "Internal Server Error",
      status: 500,
    });
  }
}
