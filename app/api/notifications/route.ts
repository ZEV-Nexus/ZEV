import { getCurrentUser } from "@/shared/service/server/auth";
import { getUserNotifications } from "@/shared/service/server/notification";
import { apiResponse } from "@/shared/service/server/response";
import { connectMongoose } from "@/shared/lib/mongoose";
import { userModel } from "@/shared/schema";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const result = await getUserNotifications({
      userId: dbUser.id,
      page,
      limit,
    });

    return apiResponse({ ok: true, data: result });
  } catch (error) {
    return apiResponse({
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch notifications",
      status: 500,
    });
  }
}
