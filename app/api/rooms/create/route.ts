import { roomModel } from "@/shared/schema";
import { createMember, getRoomMembers } from "@/shared/service/server/member";
import { createRoom } from "@/shared/service/server/room";
import { createDMKey } from "@/shared/lib/utils";
import { User } from "@/shared/types";
import { NextResponse } from "next/server";

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

    return NextResponse.json(
      {
        ok: true,
        data: {
          room: {
            id: room.id,
            name: roomName,
            roomType,
            createdAt: room.createdAt,
            roomId: room.roomId,
          },
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
