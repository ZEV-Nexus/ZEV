import { NextResponse } from "next/server";
import { userModel } from "@/shared/schema";
import { connectMongoose } from "@/shared/lib/mongoose";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;

    await connectMongoose();
    const user = await userModel
      .findOne({ username: username.toLowerCase() })
      .select("-password -__v");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        userId: user.userId,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        bio: user.bio || "",
        avatar: user.avatar || "",
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
