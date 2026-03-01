import { NextResponse } from "next/server";
import { getCurrentUser } from "@/shared/service/server/auth";
import { updateMemberRole } from "@/shared/service/server/member";
import { publishBulkUserNotification } from "@/shared/lib/server-ably";
import { memberModel, roomModel } from "@/shared/schema";
import type { User } from "@/shared/types";

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
    const { memberId, role } = await req.json();

    if (!memberId || !role) {
      return NextResponse.json(
        { error: "memberId and role are required" },
        { status: 400 },
      );
    }

    if (!["admin", "owner", "member", "guest"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const updatedMember = await updateMemberRole(
      user.id,
      roomId,
      memberId,
      role,
    );

    // Publish real-time notification to all room members
    const room = await roomModel.findOne({ roomId });
    if (room) {
      const allMembers = await memberModel.find({ room: room._id }).populate<{
        user: Pick<User, "id">;
      }>({ path: "user", select: "id" });

      const memberUserIds = allMembers
        .map((m) => m.user?.id)
        .filter((id): id is string => Boolean(id));

      await publishBulkUserNotification(memberUserIds, "member-role-updated", {
        roomId,
        memberId: updatedMember._id,
        newRole: role,
        updatedBy: {
          userId: user.id,
          nickname: user.nickname,
        },
      });
    }

    return NextResponse.json({ success: true, data: updatedMember });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: message || "Internal Server Error" },
      {
        status:
          message?.includes("Only") || message?.includes("Cannot") ? 403 : 500,
      },
    );
  }
}
