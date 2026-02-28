import { userModel } from "@/shared/schema";
import { getCurrentUser } from "@/shared/service/server/auth";
import { apiResponse } from "@/shared/service/server/response";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return apiResponse({ error: "Unauthorized", status: 401 });
    }

    const body = await req.json();
    const { nickname, bio, avatar } = body;

    const update: Record<string, string> = {};

    if (nickname !== undefined) {
      const trimmed = nickname.trim();
      if (!trimmed || trimmed.length < 1 || trimmed.length > 50) {
        return apiResponse({
          error: "Nickname must be 1-50 characters",
          status: 400,
        });
      }
      update.nickname = trimmed;
    }

    if (bio !== undefined) {
      if (typeof bio !== "string" || bio.length > 200) {
        return apiResponse({
          error: "Bio must be at most 200 characters",
          status: 400,
        });
      }
      update.bio = bio.trim();
    }

    if (avatar !== undefined) {
      if (typeof avatar !== "string") {
        return apiResponse({
          error: "Invalid avatar URL",
          status: 400,
        });
      }
      update.avatar = avatar;
    }

    if (Object.keys(update).length === 0) {
      return apiResponse({ error: "No fields to update", status: 400 });
    }

    const updatedUser = await userModel
      .findOneAndUpdate({ userId: currentUser.userId }, update, { new: true })
      .select("nickname bio avatar");

    if (!updatedUser) {
      return apiResponse({ error: "User not found", status: 404 });
    }

    return apiResponse({
      ok: true,
      data: {
        nickname: updatedUser.nickname,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return apiResponse({ error: "Internal Server Error", status: 500 });
  }
}
