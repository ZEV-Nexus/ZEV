import { memberModel, roomModel } from "@/shared/schema";

import { IRoomCategory } from "@/shared/schema/room-category";

import { ChatRoom, RoomType, User } from "@/shared/types";

export async function createMember({
  userId,
  roomId,
  roomType,
  role = "admin",
  nickname,
  notificationSetting = "all",
  pinned = false,
  roomCategory,
}: {
  userId: string;
  roomId: string;
  roomType: RoomType;
  role?: "admin" | "owner" | "member" | "guest";
  nickname?: string;
  notificationSetting?: "all" | "mentions" | "mute";
  pinned?: boolean;
  roomCategory?: string;
}) {
  const member = await memberModel.findOne({
    user: userId,
    room: roomId,
  });
  if (member) {
    return member;
  }
  if (roomType === "dm") {
    role = "owner";
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
    .populate<{
      user: User & { id: string };
    }>({
      path: "user",
      select: "nickname avatar  userId email username",
    })
    .populate<{ roomCategory: IRoomCategory & { id: string } }>({
      path: "roomCategory",
      select: "title index",
    });

  return members;
};

export const getUserRooms = async (userId: string) => {
  const members = await memberModel
    .find({ user: userId })
    .populate<{
      room: ChatRoom;
    }>({
      path: "room",
      select: "name roomType lastMessage createdAt",
      populate: {
        path: "lastMessage",
        select: "content createdAt member attachments",

        populate: [
          {
            path: "member",
            select: "nickname avatar user",
            populate: {
              path: "user",
              select: "nickname avatar username ",
            },
          },
          {
            path: "attachments",
            select: "filename url resourceType",
          },
        ],
      },
    })
    .populate<{
      roomCategory?: IRoomCategory & { id: string };
    }>({
      path: "roomCategory",
      select: "title index",
    });

  return members;
};

export const getMembersByRoomId = async (roomId: string) => {
  const roomDoc = await roomModel.findById(roomId);

  if (!roomDoc) {
    return [];
  }

  const members = await memberModel
    .find({ room: roomDoc._id })
    .populate<{
      user: User;
    }>({ path: "user", select: "nickname avatar userId email username" })
    .populate<{
      room: ChatRoom;
    }>({ path: "room", select: "name roomType lastMessage" });

  return members;
};

export async function updateMemberCategory(
  userId: string,
  roomId: string,
  categoryId: string | null,
) {
  // Find the actual room doc first since roomId passed from frontend might be the public ID
  const room = await roomModel.findOne({ _id: roomId });
  if (!room) throw new Error("Room not found");

  const update: Record<string, string | null> = { roomCategory: categoryId };

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
  const room = await roomModel.findById(roomId);

  if (!room) throw new Error("Room not found");

  const update: Record<string, string | boolean> = {};
  if (notificationSetting !== undefined)
    update.notificationSetting = notificationSetting;
  if (pinned !== undefined) update.pinned = pinned;

  return await memberModel.findOneAndUpdate(
    { user: userId, room: room.id },
    update,
    { new: true },
  );
}

export async function inviteMembers(roomId: string, userIds: string[]) {
  const room = await roomModel.findById(roomId);
  if (!room) throw new Error("Room not found");

  const results = [];

  for (const userId of userIds) {
    const existing = await memberModel.findOne({
      user: userId,
      room: room.id,
    });
    if (!existing) {
      const newMember = await createMember({
        userId,
        roomId: room.id,
        role: "member",
        roomType: room.roomType as RoomType,
      });
      results.push(newMember);
    }
  }

  return results;
}

export async function updateMemberRole(
  operatorUserId: string,
  roomId: string,
  targetMemberId: string,
  newRole: "admin" | "owner" | "member" | "guest",
) {
  const room = await roomModel.findById(roomId);
  if (!room) throw new Error("Room not found");

  const operatorMember = await memberModel.findOne({
    user: operatorUserId,
    room: room.id,
  });
  if (!operatorMember) throw new Error("Operator is not a member of this room");
  if (!["admin", "owner"].includes(operatorMember.role || ""))
    throw new Error("Only admin or owner can change roles");

  // Find target member
  const targetMember = await memberModel.findById(targetMemberId).populate<{
    user: User;
  }>({ path: "user", select: "nickname avatar _id userId email" });
  if (!targetMember) throw new Error("Target member not found");

  // Cannot change own role
  if (targetMember.user.id === operatorUserId)
    throw new Error("Cannot change your own role");

  // Owner cannot be demoted by admin
  if (targetMember.role === "owner" && operatorMember.role !== "owner")
    throw new Error("Only owner can change another owner's role");

  targetMember.role = newRole;
  await targetMember.save();

  return targetMember;
}
