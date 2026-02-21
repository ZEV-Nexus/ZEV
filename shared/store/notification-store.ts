"use client";

import { create } from "zustand";
import type { Notification } from "@/shared/types";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  hasMore: boolean;
  isLoaded: boolean;

  /** Set the initial list of notifications from API */
  setNotifications: (
    notifications: Notification[],
    unreadCount: number,
    hasMore: boolean,
  ) => void;

  /** Prepend a new real-time notification */
  addNotification: (notification: Notification) => void;

  /** Append more notifications from pagination */
  appendNotifications: (
    notifications: Notification[],
    hasMore: boolean,
  ) => void;

  /** Mark specific notifications as read (locally) */
  markAsRead: (ids: string[]) => void;

  /** Mark all notifications as read (locally) */
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  hasMore: false,
  isLoaded: false,

  setNotifications: (notifications, unreadCount, hasMore) =>
    set({ notifications, unreadCount, hasMore, isLoaded: true }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  appendNotifications: (newNotifications, hasMore) =>
    set((state) => ({
      notifications: [...state.notifications, ...newNotifications],
      hasMore,
    })),

  markAsRead: (ids) =>
    set((state) => {
      const idSet = new Set(ids);
      let readDelta = 0;
      const updated = state.notifications.map((n) => {
        if (idSet.has(n.id) && !n.read) {
          readDelta++;
          return { ...n, read: true };
        }
        return n;
      });
      return {
        notifications: updated,
        unreadCount: Math.max(0, state.unreadCount - readDelta),
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));
