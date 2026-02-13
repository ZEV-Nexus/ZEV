import { connectMongoose } from "@/shared/lib/mongoose";
import { userModel } from "@/shared/schema";
import { getCurrentUser } from "@/shared/service/server/auth";
import { User } from "@/shared/types";

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Failed to create group" },
        { status: 401 },
      );
    }
    await connectMongoose();
    const users = await userModel.find({
      nickname: { $regex: query, $options: "i" },
      _id: { $ne: user.id },
    });
    const result: Pick<
      User,
      "id" | "userId" | "email" | "nickname" | "avatar"
    >[] = users.map((user) => ({
      id: user._id.toString(),
      userId: user.userId!,
      email: user.email!,
      nickname: user.nickname!,
      avatar: user.avatar!,
    }));

    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    console.error("User search error:", error);
    return NextResponse.json(
      { ok: false, error: (error as Error).message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
