import { NextResponse } from "next/server";
import { updateRoomCategoryTitle } from "@/shared/service/server/room-category";
import { getCurrentUser } from "@/shared/service/server/auth";

export async function POST(req: Request) {
  try {
    const { categoryId, name } = await req.json();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!categoryId || !name) {
      return NextResponse.json(
        { error: "categoryId and name are required" },
        { status: 400 },
      );
    }

    const updated = await updateRoomCategoryTitle(categoryId, name);

    if (!updated) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 },
    );
  }
}
