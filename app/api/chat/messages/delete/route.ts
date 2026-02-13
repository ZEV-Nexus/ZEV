import { getCurrentUser } from "@/shared/service/server/auth";
import { deleteMessage } from "@/shared/service/server/message";
import { apiResponse } from "@/shared/service/server/response";

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
    }

    const { messageId } = await req.json();
    if (!messageId) {
      return apiResponse({ ok: false, message: "Bad Request", status: 400 });
    }

    const message = await deleteMessage(messageId);
    return apiResponse({ data: message });
  } catch (error) {
    return apiResponse({
      ok: false,
      message: "Internal Server Error",
      status: 500,
    });
  }
}
