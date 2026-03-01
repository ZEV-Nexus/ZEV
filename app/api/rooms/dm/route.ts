import { roomModel } from "@/shared/schema";
import { createDMKey } from "@/shared/lib/utils";
import { getCurrentUser } from "@/shared/service/server/auth";
import { apiResponse } from "@/shared/service/server/response";
import { createRoom } from "@/shared/service/server/room";
import { createMember, getRoomMembers } from "@/shared/service/server/member";
import { publishUserNotification } from "@/shared/lib/server-ably";
import { createNotification } from "@/shared/service/server/notification";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return apiResponse({ error: "Unauthorized", status: 401 });
    }

    const { targetUserId, targetUser } = await req.json();

    if (!targetUserId) {
      return apiResponse({ error: "targetUserId is required", status: 400 });
    }

    if (targetUserId === currentUser.id) {
      return apiResponse({
        error: "Cannot create DM with yourself",
        status: 400,
      });
    }

    const dmKey = createDMKey(currentUser.id, targetUserId);

    // Check if DM room already exists
    const existingRoom = await roomModel.findOne({ dmKey });

    if (existingRoom) {
      const members = await getRoomMembers(existingRoom.id);
      return apiResponse({
        ok: true,
        data: {
          room: {
            id: existingRoom.id,
            name: existingRoom.name,
            roomType: existingRoom.roomType,
            createdAt: existingRoom.createdAt,
            roomId: existingRoom.roomId,
          },
          members,
          isExisting: true,
        },
      });
    }

    // Create new DM room
    const room = await createRoom({
      ownerId: currentUser.id,
      roomName: "",
      roomType: "dm",
      dmKey,
    });

    // Create member for target user
    await createMember({
      userId: targetUserId,
      roomId: room.id,
      roomType: "dm",
      role: "member",
      nickname: targetUser?.nickname || "",
      notificationSetting: "all",
      pinned: false,
    });

    const members = await getRoomMembers(room.id);

    const roomData = {
      id: room.id,
      name: room.name,
      roomType: room.roomType,
      createdAt: room.createdAt,
      roomId: room.roomId,
    };

    // Send real-time notification to the target user
    if (targetUser?.userId) {
      const notificationPayload = {
        type: "room-created",
        room: roomData,
        members: members.map((m) => ({
          id: m.id || m._id?.toString(),
          user: {
            id: m.user?.id,
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
          id: currentUser.id,
          userId: currentUser.userId,
          nickname: currentUser.nickname,
          avatar: currentUser.avatar,
        },
      };

      Promise.allSettled([
        publishUserNotification(
          targetUser.userId,
          "room-created",
          notificationPayload,
        ),
        createNotification({
          recipientId: targetUserId,
          senderId: currentUser.id,
          type: "room_invite",
          roomId: room.id,
        }),
      ]).catch(() => {});
    }

    return apiResponse({
      ok: true,
      data: {
        room: roomData,
        members,
        isExisting: false,
      },
    });
  } catch (error) {
    console.error("Error finding or creating DM:", error);
    return apiResponse({ error: "Internal Server Error", status: 500 });
  }
}
