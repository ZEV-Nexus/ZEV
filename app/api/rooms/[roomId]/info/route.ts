import { NextResponse } from "next/server";
import { getCurrentUser } from "@/shared/service/server/auth";
import { updateRoomInfo } from "@/shared/service/server/room";
import { getMembersByRoomId } from "@/shared/service/server/member";
import { publishBulkUserNotification } from "@/shared/lib/server-ably";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await params;
    const { name, avatar } = await req.json();

    // Check if user is admin/owner
    const members = await getMembersByRoomId(roomId);
    const currentMember = members.find(
      (m) => (m.user as any)?.userId === user.userId,
    );

    if (
      !currentMember ||
      !["admin", "owner"].includes(currentMember.role || "")
    ) {
      return NextResponse.json(
        { error: "Only admin or owner can update room info" },
        { status: 403 },
      );
    }

    const updatedRoom = await updateRoomInfo(roomId, { name, avatar });

    // Publish real-time notification to all room members
    const memberUserIds = members
      .map((m) => (m.user as any)?.userId)
      .filter(Boolean);

    await publishBulkUserNotification(memberUserIds, "room-info-updated", {
      roomId,
      name: updatedRoom?.name,
      avatar: updatedRoom?.avatar,
      updatedBy: {
        userId: user.userId,
        nickname: user.nickname,
      },
    });

    return NextResponse.json({ success: true, data: updatedRoom });
  } catch (error: any) {
    console.error("Error updating room info:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
