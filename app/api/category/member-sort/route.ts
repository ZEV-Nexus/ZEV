import { NextResponse } from "next/server";
import { updateMemberCategory } from "@/shared/service/server/member";

import { getCurrentUser } from "@/shared/service/server/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, categoryId } = await req.json();

    if (!roomId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Pass categoryId as null if it's a default category (dm/group)
    const targetCategoryId =
      categoryId === "dm" || categoryId === "group" ? null : categoryId;

    await updateMemberCategory(user.id, roomId, targetCategoryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating member sort:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
