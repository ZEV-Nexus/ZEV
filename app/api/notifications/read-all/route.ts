import { getCurrentUser } from "@/shared/service/server/auth";
import { markAllNotificationsAsRead } from "@/shared/service/server/notification";
import { apiResponse } from "@/shared/service/server/response";
import { connectMongoose } from "@/shared/lib/mongoose";
import { userModel } from "@/shared/schema";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
    }

    await connectMongoose();
    const dbUser = await userModel.findOne({ userId: user.userId });
    if (!dbUser) {
      return apiResponse({ ok: false, message: "User not found", status: 404 });
    }

    await markAllNotificationsAsRead(dbUser.id);
    return apiResponse({ ok: true, message: "All notifications marked as read" });
  } catch (error) {
    return apiResponse({
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to mark all as read",
      status: 500,
    });
  }
}
