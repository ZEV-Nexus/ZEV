import { notificationModel, userModel } from "@/shared/schema";
import { connectMongoose } from "@/shared/lib/mongoose";
import { publishUserNotification } from "@/shared/lib/server-ably";
import type { NotificationType } from "@/shared/types";

const NOTIFICATIONS_PER_PAGE = 30;

/**
 * Create a notification record and push it via Ably in real-time.
 * Returns the populated notification document.
 */
export async function createNotification({
  recipientId,
  senderId,
  type,
  postId,
  commentId,
  roomId,
}: {
  recipientId: string;
  senderId: string;
  type: NotificationType;
  postId?: string;
  commentId?: string;
  roomId?: string;
}) {
  await connectMongoose();

  // Don't notify yourself
  if (recipientId === senderId) return null;

  const notification = await notificationModel.create({
    recipient: recipientId,
    sender: senderId,
    type,
    post: postId || null,
    comment: commentId || null,
    room: roomId || null,
  });

  const populated = await notification.populate([
    { path: "sender", select: "userId username nickname avatar" },
    { path: "post", select: "content" },
    { path: "comment", select: "content" },
    { path: "room", select: "name roomType roomId" },
  ]);

  const notificationData = populated.toJSON();

  // Get the recipient's userId (not ObjectId) for the Ably channel
  const recipientUser = await userModel.findById(recipientId);
  if (recipientUser) {
    publishUserNotification(
      recipientUser.userId!,
      "new-notification",
      notificationData,
    ).catch((err) =>
      console.error("[Notification] Failed to push via Ably:", err),
    );
  }

  return notificationData;
}

/**
 * Fetch paginated notifications for a user.
 */
export async function getUserNotifications({
  userId,
  page = 1,
  limit = NOTIFICATIONS_PER_PAGE,
}: {
  userId: string;
  page?: number;
  limit?: number;
}) {
  await connectMongoose();
  const skip = (page - 1) * limit;

  const notifications = await notificationModel
    .find({ recipient: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("sender", "userId username nickname avatar")
    .populate("post", "content")
    .populate("comment", "content")
    .populate("room", "name roomType roomId");

  const total = await notificationModel.countDocuments({ recipient: userId });
  const unreadCount = await notificationModel.countDocuments({
    recipient: userId,
    read: false,
  });

  return {
    notifications: notifications.map((n) => n.toJSON()),
    total,
    unreadCount,
    hasMore: skip + notifications.length < total,
  };
}

/**
 * Get unread count for a user.
 */
export async function getUnreadCount(userId: string) {
  await connectMongoose();
  return notificationModel.countDocuments({ recipient: userId, read: false });
}

/**
 * Mark specific notifications as read.
 */
export async function markNotificationsAsRead(
  userId: string,
  notificationIds: string[],
) {
  await connectMongoose();
  await notificationModel.updateMany(
    { _id: { $in: notificationIds }, recipient: userId },
    { read: true },
  );
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsAsRead(userId: string) {
  await connectMongoose();
  await notificationModel.updateMany(
    { recipient: userId, read: false },
    { read: true },
  );
}
