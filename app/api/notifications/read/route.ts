import { getCurrentUser } from "@/shared/service/server/auth";
import { markNotificationsAsRead } from "@/shared/service/server/notification";
import { apiResponse } from "@/shared/service/server/response";
import { connectMongoose } from "@/shared/lib/mongoose";
import { userModel } from "@/shared/schema";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
    }

    await connectMongoose();
    const dbUser = await userModel.findById(user.id);
    if (!dbUser) {
      return apiResponse({ ok: false, message: "User not found", status: 404 });
    }

    const { notificationIds } = await request.json();
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return apiResponse({
        ok: false,
        message: "notificationIds is required",
        status: 400,
      });
    }

    await markNotificationsAsRead(dbUser.id, notificationIds);
    return apiResponse({ ok: true, message: "Marked as read" });
  } catch (error) {
    return apiResponse({
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to mark as read",
      status: 500,
    });
  }
}
