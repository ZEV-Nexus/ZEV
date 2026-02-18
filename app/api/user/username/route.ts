import { NextResponse } from "next/server";
import { userModel } from "@/shared/schema";
import { connectMongoose } from "@/shared/lib/mongoose";
import { getCurrentUser } from "@/shared/service/server/auth";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await req.json();

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    const trimmed = username.trim().toLowerCase();

    // Validate format: only lowercase letters, numbers, underscores, hyphens, dots. 3-30 chars.
    const usernameRegex = /^[a-z0-9_.-]{3,30}$/;
    if (!usernameRegex.test(trimmed)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-30 characters, only lowercase letters, numbers, underscores, hyphens, and dots",
        },
        { status: 400 },
      );
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
      return NextResponse.json(
        { error: "This username is reserved" },
        { status: 400 },
      );
    }

    await connectMongoose();

    // Check uniqueness
    const existing = await userModel.findOne({ username: trimmed });
    if (existing && existing.userId !== currentUser.userId) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 },
      );
    }

    // Update username
    const updatedUser = await userModel.findOneAndUpdate(
      { userId: currentUser.userId },
      { username: trimmed },
      { new: true },
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { username: updatedUser.username },
    });
  } catch (error) {
    console.error("Error updating username:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
