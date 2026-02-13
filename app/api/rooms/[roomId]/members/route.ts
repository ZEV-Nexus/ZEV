import { mongooseIdTransform } from "@/shared/service/dto/transform";
import { getRoomMembers } from "@/shared/service/server/member";
import { NextResponse } from "next/server";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const members = await getRoomMembers(roomId);

  return NextResponse.json({ ok: true, data: members });
}
