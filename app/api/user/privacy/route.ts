import { userModel } from "@/shared/schema";
import { getCurrentUser } from "@/shared/service/server/auth";
import { apiResponse } from "@/shared/service/server/response";

const DEFAULT_PRIVACY_SETTINGS = {
  showReadReceipts: true,
  showTypingIndicator: true,
  showOnlineStatus: true,
};

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return apiResponse({ error: "Unauthorized", status: 401 });
    }

    const user = await userModel
      .findOne({ userId: currentUser.userId })
      .select("privacySettings");

    if (!user) {
      return apiResponse({ error: "User not found", status: 404 });
    }

    const privacySettings = {
      ...DEFAULT_PRIVACY_SETTINGS,
      ...(user.privacySettings || {}),
    };

    return apiResponse({ data: privacySettings });
  } catch (error) {
    console.error("[PRIVACY_GET_ERROR]", error);
    return apiResponse({
      ok: false,
      message: "Internal Server Error",
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return apiResponse({ error: "Unauthorized", status: 401 });
    }

    const body = await req.json();
    const { showReadReceipts, showTypingIndicator, showOnlineStatus } = body;

    const update: Record<string, boolean> = {};

    if (typeof showReadReceipts === "boolean") {
      update["privacySettings.showReadReceipts"] = showReadReceipts;
    }
    if (typeof showTypingIndicator === "boolean") {
      update["privacySettings.showTypingIndicator"] = showTypingIndicator;
    }
    if (typeof showOnlineStatus === "boolean") {
      update["privacySettings.showOnlineStatus"] = showOnlineStatus;
    }

    if (Object.keys(update).length === 0) {
      return apiResponse({ error: "No fields to update", status: 400 });
    }

    const updatedUser = await userModel
      .findOneAndUpdate(
        { userId: currentUser.userId },
        { $set: update },
        { new: true },
      )
      .select("privacySettings");

    if (!updatedUser) {
      return apiResponse({ error: "User not found", status: 404 });
    }

    const privacySettings = {
      ...DEFAULT_PRIVACY_SETTINGS,
      ...(updatedUser.privacySettings || {}),
    };

    return apiResponse({ data: privacySettings });
  } catch (error) {
    console.error("[PRIVACY_UPDATE_ERROR]", error);
    return apiResponse({
      ok: false,
      message: "Internal Server Error",
      status: 500,
    });
  }
}
