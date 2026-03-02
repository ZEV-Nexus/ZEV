import { auth } from "@/auth";
import { memberModel, messageModel } from "@/shared/schema";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

export async function hasAccessToRoom(userId: string, roomId: string) {
  const member = await memberModel.findOne({ user: userId, room: roomId });
  return !!member;
}

export async function isOwnMessage(userId: string, messageId: string) {
  const memberIds = await memberModel.find({ user: userId }).distinct("_id");

  const message = await messageModel.findOne({
    _id: messageId,
    member: { $in: memberIds },
  });
  return !!message;
}
