import { memberModel, roomModel } from "@/shared/schema";

import { IRoomCategory } from "@/shared/schema/room-category";

export async function createMember({
  userId,
  roomId,
  role = "admin",
  nickname,
  notificationSetting = "all",
  pinned = false,
  roomCategory,
}: {
  userId: string;
  roomId: string;
  role?: "admin" | "owner" | "member" | "guest";
  nickname?: string;
  notificationSetting?: "all" | "mentions" | "mute";
  pinned?: boolean;
  roomCategory?: IRoomCategory;
}) {
  const member = await memberModel.findOne({
    user: userId,
    room: roomId,
  });
  if (member) {
    return member;
  }

  const newMember = new memberModel({
    user: userId,
    room: roomId,
    role,
    nickname,
    notificationSetting,
    pinned,
    roomCategory,
  });
  return await newMember.save();
}
export const getRoomMembers = async (roomId: string) => {
  const members = await memberModel
    .find({ room: roomId })
    .populate({ path: "user", select: "nickname avatar _id userId email" })
    .populate({ path: "roomCategory", select: "title index" })
    .exec();

  return members;
};

export const getUserRooms = async (userId: string) => {
  const members = await memberModel
    .find({ user: userId })
    .populate({
      path: "room",
      select: "name roomType roomId lastMessage createdAt",
      populate: {
        path: "lastMessage",
        select: "content createdAt member",
        populate: {
          path: "member",
          select: "nickname avatar user",
          populate: {
            path: "user",
            select: "nickname avatar",
          },
        },
      },
    })
    .populate({
      path: "roomCategory",
      select: "title index",
    })
    .exec();

  return members;
};

export const getMembersByRoomId = async (roomId: string) => {
  const roomDoc = await roomModel.findOne({ roomId });

  if (!roomDoc) {
    return [];
  }

  const members = await memberModel
    .find({ room: roomDoc._id })
    .populate({ path: "user", select: "nickname avatar _id userId email" })
    .populate({ path: "room", select: "name roomType roomId lastMessage" })
    .exec();

  return members;
};

export async function updateMemberCategory(
  userId: string,
  roomId: string,
  categoryId: string | null,
  index?: number,
) {
  // Find the actual room doc first since roomId passed from frontend might be the public ID
  const room = await roomModel.findOne({ _id: roomId });
  if (!room) throw new Error("Room not found");

  const update: Record<string, any> = { roomCategory: categoryId };

  // If we had an index field in member schema for custom sort order within category
  // we would update it here. For now, we just move categories.
  // if (typeof index === 'number') update.index = index;

  return await memberModel.findOneAndUpdate(
    { user: userId, room: room._id },
    update,
    { new: true },
  );
}

export async function updateMemberSettings(
  userId: string,
  roomId: string,
  notificationSetting?: "all" | "mentions" | "mute",
  pinned?: boolean,
) {
  // Try to find by _id first (if passed directly from internal logic) or public roomId
  let room = await roomModel.findById(roomId);
  if (!room) {
    room = await roomModel.findOne({ roomId });
  }

  if (!room) throw new Error("Room not found");

  const update: Record<string, any> = {};
  if (notificationSetting !== undefined)
    update.notificationSetting = notificationSetting;
  if (pinned !== undefined) update.pinned = pinned;

  return await memberModel.findOneAndUpdate(
    { user: userId, room: room._id },
    update,
    { new: true },
  );
}

export async function inviteMembers(roomId: string, userIds: string[]) {
  const room = await roomModel.findOne({ roomId });
  if (!room) throw new Error("Room not found");

  const results = [];

  for (const userId of userIds) {
    const existing = await memberModel.findOne({
      user: userId,
      room: room._id,
    });
    if (!existing) {
      const newMember = await createMember({
        userId,
        roomId: room._id as unknown as string,
        role: "member",
      });
      results.push(newMember);
    }
  }

  return results;
}
