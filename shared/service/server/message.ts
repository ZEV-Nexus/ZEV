import { memberModel, messageModel, roomModel } from "@/shared/schema";
import AttachmentModel, { IAttachment } from "@/shared/schema/attachment";
import { createAttachment } from "./attachment";
import mongoose from "mongoose";
import { IMessage } from "@/shared/schema/message";

export async function getMessages(
  roomId: string,
  limit: number = 50,
  before?: string,
) {
  const query: Record<string, unknown> = { room: roomId, deletedAt: null };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await messageModel
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate([
      {
        path: "member",
        populate: { path: "user", select: "nickname avatar userId" },
      },
      {
        path: "replyTo",
        populate: {
          path: "member",
          populate: { path: "user", select: "nickname avatar userId" },
        },
      },
      {
        path: "attachments",
        select: "filename url resourceType size publicId mimeType",
      },
    ]);

  return messages.reverse();
}

export async function sendMessage(
  memberId: string,
  roomId: string,
  content?: string,
  attachments?: IAttachment[],
  replyTo?: string,
) {
  const message = new messageModel({
    member: memberId,
    room: roomId,
    content,
    replyTo,
  });
  if (attachments) {
    const attachmentIds = await Promise.all(
      attachments.map((attachment) =>
        createAttachment(attachment, message._id.toString()),
      ),
    );
    message.attachments = attachmentIds.map((att) => att._id);
  }
  const savedMessage = await message.save();
  memberModel.findByIdAndUpdate(memberId, {
    lastReadMessage: savedMessage._id,
  });
  await roomModel.findByIdAndUpdate(roomId, { lastMessage: savedMessage._id });
  return await savedMessage.populate([
    {
      path: "member",
      populate: { path: "user", select: "nickname avatar userId" },
    },
    {
      path: "replyTo",
      populate: {
        path: "member",
        populate: { path: "user", select: "nickname avatar userId" },
      },
    },
    { path: "attachments" },
  ]);
}

export async function editMessage(messageId: string, content: string) {
  const message = await messageModel.findByIdAndUpdate(
    messageId,
    { content, editedAt: new Date() },
    { new: true },
  );
  if (!message) throw new Error("Message not found");
  return await message.populate({
    path: "member",
    populate: { path: "user", select: "nickname avatar userId" },
  });
}

export async function deleteMessage(messageId: string) {
  const message = await messageModel.findByIdAndUpdate(
    messageId,
    { deletedAt: new Date() },
    { new: true },
  );
  if (!message) throw new Error("Message not found");
  return await message.populate({
    path: "member",
    populate: { path: "user", select: "nickname avatar userId" },
  });
}

export async function getUnreadCount(roomId: string, userId: string) {
  const member = await memberModel
    .findOne({ room: roomId, user: userId })
    .populate<{ lastReadMessage: IMessage }>("lastReadMessage");
  if (!member) throw new Error("Member not found");
  const query: any = {
    room: new mongoose.Types.ObjectId(roomId),
    member: { $ne: member._id },
  };
  console.log(member.lastReadMessage);

  if (member.lastReadMessage?.createdAt) {
    query.createdAt = { $gt: new Date(member.lastReadMessage.createdAt) };
  }

  const messages = await messageModel.countDocuments(query);
  console.log(messages);
  return messages;
}
