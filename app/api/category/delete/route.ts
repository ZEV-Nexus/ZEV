import { NextResponse } from "next/server";
import { deleteRoomCategory } from "@/shared/service/server/room-category";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { categoryId } = await req.json();

    if (!categoryId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await deleteRoomCategory(categoryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
