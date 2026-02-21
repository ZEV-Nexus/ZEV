import { fetchApi } from "./fetch";
import type { Notification } from "@/shared/types";

export async function getNotifications(page = 1, limit = 30) {
  return fetchApi<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
    hasMore: boolean;
  }>(`notifications?page=${page}&limit=${limit}`);
}

export async function markAsRead(notificationIds: string[]) {
  return fetchApi<void>("notifications/read", {
    method: "POST",
    body: JSON.stringify({ notificationIds }),
  });
}

export async function markAllAsRead() {
  return fetchApi<void>("notifications/read-all", {
    method: "POST",
  });
}
