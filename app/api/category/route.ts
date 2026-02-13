import { NextResponse } from "next/server";
import { createRoomCategory } from "@/shared/service/server/room-category";
import { getCurrentUser } from "@/shared/service/server/auth";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    const user = await getCurrentUser();
    console.log(user, name);
    if (!user) {
      return NextResponse.json(
        { error: "Failed to create group" },
        { status: 401 },
      );
    }
    const roomCategory = await createRoomCategory(user.id, name);
    return NextResponse.json({ ok: true, data: roomCategory }, { status: 201 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 },
    );
  }
}
