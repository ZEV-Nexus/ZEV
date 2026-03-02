import { NextResponse } from "next/server";
import { deleteRoomCategory } from "@/shared/service/server/room-category";

import { getCurrentUser } from "@/shared/service/server/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { categoryId } = await req.json();

    if (!categoryId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await deleteRoomCategory(user.id,   categoryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
