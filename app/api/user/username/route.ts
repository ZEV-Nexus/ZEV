import { userModel } from "@/shared/schema";

import { getCurrentUser } from "@/shared/service/server/auth";
import { apiResponse } from "@/shared/service/server/response";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return apiResponse({ error: "Unauthorized", status: 401 });
    }

    const { username } = await req.json();

    if (!username || typeof username !== "string") {
      return apiResponse({
        error: "Username is required",
        status: 400,
      });
    }

    const trimmed = username.trim().toLowerCase();

    // Validate format: only lowercase letters, numbers, underscores, hyphens, dots. 3-30 chars.
    const usernameRegex = /^[a-z0-9_.-]{3,30}$/;
    if (!usernameRegex.test(trimmed)) {
      return apiResponse({
        error:
          "Username must be 3-30 characters, only lowercase letters, numbers, underscores, hyphens, and dots",
        status: 400,
      });
    }

    // Reserved words
    const reserved = [
      "admin",
      "api",
      "auth",
      "c",
      "settings",
      "profile",
      "user",
      "help",
      "about",
      "login",
      "register",
      "logout",
      "signup",
      "signin",
    ];
    if (reserved.includes(trimmed)) {
      return apiResponse({ error: "This username is reserved", status: 400 });
    }

    const existing = await userModel.findOne({ username: trimmed });
    if (existing && existing.userId !== currentUser.userId) {
      return apiResponse({ error: "Username already taken", status: 409 });
    }

    // Update username
    const updatedUser = await userModel.findOneAndUpdate(
      { userId: currentUser.userId },
      { username: trimmed },
      { new: true },
    );

    if (!updatedUser) {
      return apiResponse({ error: "User not found", status: 404 });
    }

    return apiResponse({
      ok: true,
      data: { username: updatedUser.username },
    });
  } catch (error) {
    console.error("Error updating username:", error);
    return apiResponse({ error: "Internal Server Error", status: 500 });
  }
}
