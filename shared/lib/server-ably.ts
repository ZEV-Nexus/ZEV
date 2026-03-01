import Ably from "ably";

// This utility is for SERVER-SIDE use only (API Routes)
// It uses ABLY_API_KEY securely.
export const getAblyRest = () => {
  if (!process.env.ABLY_API_KEY) {
    throw new Error("ABLY_API_KEY is not defined");
  }
  return new Ably.Rest({ key: process.env.ABLY_API_KEY });
};

/**
 * Publish a notification to a specific user's notification channel.
 * Channel follows the convention: `user-notification:{userId}`
 */
export async function publishUserNotification(
  userId: string,
  eventName: string,
  data: Record<string, unknown>,
) {
  const ably = getAblyRest();
  const channel = ably.channels.get(`user-notification:${userId}`);
  await channel.publish(eventName, data);
}

/**
 * Publish notifications to multiple users.
 * Useful for notifying all members when a room is created.
 */
export async function publishBulkUserNotification(
  userIds: string[],
  eventName: string,
  data: Record<string, unknown>,
) {
  const promises = userIds.map((userId) =>
    publishUserNotification(userId, eventName, data),
  );
  await Promise.allSettled(promises);
}
