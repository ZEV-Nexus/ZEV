import { NextResponse } from "next/server";
import { updateRoomCategoryIndex } from "@/shared/service/server/room-category";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { categoryId, index } = await req.json();

    if (!categoryId || typeof index !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await updateRoomCategoryIndex(categoryId, index);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating category sort:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
