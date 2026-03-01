import { messageModel, memberModel } from "@/shared/schema";
import mongoose from "mongoose";

export type MediaType = "image" | "file" | "link";

export interface RoomMediaResult {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  resourceType: string;
  uploadedAt: string;
  messageId: string;
  senderNickname: string;
  senderAvatar?: string;
}

export interface RoomLinkResult {
  url: string;
  messageId: string;
  content: string;
  senderNickname: string;
  senderAvatar?: string;
  createdAt: string;
}

/**
 * Get shared media (images/videos) for a room
 */
export async function getRoomMedia(
  roomId: string,
  type: MediaType,
  limit: number = 50,
  before?: string,
) {
  if (type === "link") {
    return getRoomLinks(roomId, limit, before);
  }

  const resourceTypes = type === "image" ? ["image", "video"] : ["raw", "auto"];

  const mimeTypePrefixes =
    type === "image" ? [/^image\//, /^video\//] : [/^application\//, /^text\//];

  // Find all messages in this room
  const messageQuery: Record<string, unknown> = {
    room: new mongoose.Types.ObjectId(roomId),
    deletedAt: null,
    attachments: { $exists: true, $ne: [] },
  };

  if (before) {
    messageQuery.createdAt = { $lt: new Date(before) };
  }

  const messages = await messageModel
    .find(messageQuery)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate({
      path: "member",
      populate: { path: "user", select: "nickname avatar userId" },
    })
    .populate({
      path: "attachments",
      select: "filename url resourceType size publicId mimeType uploadedAt",
    });

  const results: RoomMediaResult[] = [];

  for (const msg of messages) {
    const attachments = msg.attachments as unknown as Array<{
      _id: mongoose.Types.ObjectId;
      id: string;
      url: string;
      filename: string;
      mimeType: string;
      size: number;
      resourceType: string;
      uploadedAt: Date;
    }>;

    if (!attachments) continue;

    for (const att of attachments) {
      const matchesResourceType = resourceTypes.includes(att.resourceType);
      const matchesMimeType = mimeTypePrefixes.some((prefix) =>
        prefix.test(att.mimeType || ""),
      );

      if (matchesResourceType || matchesMimeType) {
        const member = msg.member as unknown as {
          user: { nickname: string; avatar?: string };
        };

        results.push({
          id: att.id || att._id?.toString(),
          url: att.url,
          filename: att.filename,
          mimeType: att.mimeType,
          size: att.size,
          resourceType: att.resourceType,
          uploadedAt: att.uploadedAt?.toISOString(),
          messageId: msg._id.toString(),
          senderNickname: member?.user?.nickname || "Unknown",
          senderAvatar: member?.user?.avatar,
        });

        if (results.length >= limit) break;
      }
    }

    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Extract links from messages in a room
 */
async function getRoomLinks(
  roomId: string,
  limit: number = 50,
  before?: string,
) {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

  const messageQuery: Record<string, unknown> = {
    room: new mongoose.Types.ObjectId(roomId),
    deletedAt: null,
    content: { $regex: "https?://", $options: "i" },
  };

  if (before) {
    messageQuery.createdAt = { $lt: new Date(before) };
  }

  const messages = await messageModel
    .find(messageQuery)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({
      path: "member",
      populate: { path: "user", select: "nickname avatar userId" },
    });

  const results: RoomLinkResult[] = [];

  for (const msg of messages) {
    const content = msg.content || "";
    const urls = content.match(urlRegex);
    if (!urls) continue;

    const member = msg.member as unknown as {
      user: { nickname: string; avatar?: string };
    };

    for (const url of urls) {
      results.push({
        url,
        messageId: msg._id.toString(),
        content: content.substring(0, 200),
        senderNickname: member?.user?.nickname || "Unknown",
        senderAvatar: member?.user?.avatar,
        createdAt: (msg.createdAt as Date)?.toISOString(),
      });

      if (results.length >= limit) break;
    }

    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Verify that a user is a member of a room
 */
export async function verifyRoomMembership(
  roomId: string,
  userId: string,
): Promise<boolean> {
  const member = await memberModel
    .findOne({
      room: roomId,
    })
    .populate("user", "*");

  if (!member) return false;

  // Need to check across all members
  const members = await memberModel
    .find({ room: roomId })
    .populate<{ user: { id: string } }>("user");

  return members.some((m) => m.user.id === userId);
}
