import { roomModel } from "@/shared/schema";
import { createMember, getRoomMembers } from "@/shared/service/server/member";
import { createRoom } from "@/shared/service/server/room";
import { createDMKey } from "@/shared/lib/utils";
import { User } from "@/shared/types";
import { NextResponse } from "next/server";
import { publishUserNotification } from "@/shared/lib/server-ably";
import { getCurrentUser } from "@/shared/service/server/auth";

export async function POST(request: Request) {
  try {
    const { userId, roomName, roomType, roomMembers, categoryId } =
      await request.json();
    let dmKey: string | undefined;
    if (roomType === "dm") {
      dmKey = createDMKey(userId, roomMembers[0].id);
    }
    const room = await createRoom({
      ownerId: userId,
      roomName,
      roomType,
      categoryId,
      dmKey,
    });
    await Promise.all(
      roomMembers.map(
        (
          member: Pick<User, "id" | "userId" | "email" | "nickname" | "avatar">,
        ) =>
          createMember({
            userId: member.id,
            roomId: room.id,
            role: "member",
            nickname: member.nickname,
            notificationSetting: "all",
            pinned: false,
          }),
      ),
    );
    const members = await getRoomMembers(room.id);

    // Get the current user (creator) info for notification
    const currentUser = await getCurrentUser();

    const roomData = {
      id: room.id,
      name: roomName,
      roomType,
      createdAt: room.createdAt,
      roomId: room.roomId,
    };

    // Send real-time notifications to all invited members (exclude the creator)
    const notificationPayload = {
      type: "room-created",
      room: roomData,
      members: members.map((m: any) => ({
        id: m.id || m._id?.toString(),
        user: {
          id: m.user?.id || m.user?._id?.toString(),
          userId: m.user?.userId,
          nickname: m.user?.nickname,
          avatar: m.user?.avatar,
          email: m.user?.email,
        },
        nickname: m.nickname,
        role: m.role,
        notificationSetting: m.notificationSetting,
        pinned: m.pinned,
      })),
      inviter: {
        id: currentUser?.id,
        userId: currentUser?.userId,
        nickname: currentUser?.nickname,
        avatar: currentUser?.avatar,
      },
    };

    // Notify each invited member (skip the creator)
    const notifyPromises = roomMembers
      .filter(
        (
          member: Pick<User, "id" | "userId" | "email" | "nickname" | "avatar">,
        ) => member.userId !== currentUser?.userId,
      )
      .map(
        (
          member: Pick<User, "id" | "userId" | "email" | "nickname" | "avatar">,
        ) =>
          publishUserNotification(
            member.userId,
            "room-created",
            notificationPayload,
          ).catch((err) =>
            console.error(`Failed to notify user ${member.userId}:`, err),
          ),
      );

    // Don't await — fire and forget so the response isn't blocked
    Promise.allSettled(notifyPromises).catch(() => {});

    return NextResponse.json(
      {
        ok: true,
        data: {
          room: roomData,
          members,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Something went wrong",
      },
      { status: 500 },
    );
  }
}
