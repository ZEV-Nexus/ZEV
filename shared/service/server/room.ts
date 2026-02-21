import { roomModel } from "@/shared/schema";
import type { RoomType } from "@/shared/types";

import { createMember } from "./member";

export const createRoom = async ({
  ownerId,
  roomName,
  roomType,
  categoryId,
  dmKey,
}: {
  ownerId: string;
  roomName: string;
  roomType: RoomType;
  categoryId?: string;
  dmKey?: string;
}) => {
  console.log(dmKey);

  if (roomType === "dm" && dmKey) {
    const room = await roomModel.findOne({
      dmKey,
    });
    if (room) {
      return room;
    }
  }

  const room = await roomModel.create({
    roomId: crypto.randomUUID(),
    name: roomName,
    roomType,
    dmKey,
  });

  console.log(room);

  await createMember({
    userId: ownerId,
    roomId: room.id,
    roomType,
    role: "owner",
    nickname: roomName,
    notificationSetting: "all",
    pinned: false,
    roomCategory: categoryId as any,
  });
  const savedRoom = await room.save();

  return savedRoom;
};

export const getChatRoomById = async (roomId: string) => {
  const room = await roomModel.findOne({ roomId });

  return room;
};

export const updateRoomInfo = async (
  roomId: string,
  updates: { name?: string; avatar?: string },
) => {
  const room = await roomModel.findOne({ roomId });
  if (!room) throw new Error("Room not found");

  const update: Record<string, any> = {};
  if (updates.name !== undefined) update.name = updates.name;
  if (updates.avatar !== undefined) update.avatar = updates.avatar;

  return await roomModel.findOneAndUpdate({ roomId }, update, { new: true });
};
