import { getCurrentUser } from "@/shared/service/server/auth";
import { connectMongoose } from "@/shared/lib/mongoose";
import { userModel } from "@/shared/schema";
import { NextResponse } from "next/server";

/**
 * POST /api/github/connect/disconnect
 * Disconnects the current user's GitHub account.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongoose();
    const dbUser = await userModel.findById(user.id);

    if (!dbUser) {
      return NextResponse.json(
        { ok: false, error: "找不到用戶資料" },
        { status: 404 },
      );
    }

    await userModel.findByIdAndUpdate(dbUser._id, { githubUsername: "" });

    return NextResponse.json({
      ok: true,
      message: "已成功斷開 GitHub 帳號連結",
    });
  } catch (err) {
    console.error("GitHub disconnect error:", err);
    return NextResponse.json(
      { ok: false, error: "斷開 GitHub 帳號時發生錯誤" },
      { status: 500 },
    );
  }
}
