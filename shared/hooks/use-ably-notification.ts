"use client";

import { useEffect, useRef, useState } from "react";
import * as Ably from "ably";
import { useSession } from "next-auth/react";
import { useChatStore } from "@/shared/store/chat-store";
import { useOnlineStore, OnlineUser } from "@/shared/store/online-store";
import { useTypingStore } from "@/shared/store/typing-store";
import { ChatRoom, Member, Notification, Message } from "@/shared/types";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { getRoomMembers } from "@/shared/service/api/room";
import { useNotificationStore } from "@/shared/store/notification-store";
import { getNotifications } from "@/shared/service/api/notification";
import { usePrivacyStore } from "@/shared/store/privacy-store";
import { getPrivacySettings } from "@/shared/service/api/user";
import MessageToast from "../components/toast/message-toast";
import { isMentioned } from "../lib/mention";

// Notification event types
export type NotificationType =
  | "room-created"
  | "room-invited"
  | "member-role-updated"
  | "chat-message";

export interface ChatMessagePayload {
  roomId: string;
  message: Message;
}

export interface NotificationPayload {
  type: NotificationType;
  room: ChatRoom;
  members: Member[];
  inviter: {
    id: string;
    userId: string;
    nickname: string;
    avatar?: string;
  };
}

export interface MemberRoleUpdatedPayload {
  roomId: string;
  memberId: string;
  newRole: "admin" | "owner" | "member" | "guest";
  updatedBy: {
    userId: string;
    nickname: string;
  };
}

export interface RoomInfoUpdatedPayload {
  roomId: string;
  name?: string;
  avatar?: string;
  updatedBy: {
    userId: string;
    nickname: string;
  };
}

const GLOBAL_PRESENCE_CHANNEL = "global-presence";

export function useAblyNotification() {
  const { data: session } = useSession();
  const params = useParams();
  const {
    addChatRoom,
    chatCategorys,
    updateRoomLastMessage,
    incrementUnreadCount,
  } = useChatStore();
  const { addNotification, setNotifications, isLoaded } =
    useNotificationStore();
  const { setOnlineUsers } = useOnlineStore();
  const { setUserTyping, clearUserTyping } = useTypingStore();
  const clientRef = useRef<Ably.Realtime | null>(null);
  const typingChannelsRef = useRef<Map<string, Ably.RealtimeChannel>>(
    new Map(),
  );
  const activeRoomIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeRoomIdRef.current = (params?.roomId as string) || null;
  }, [params?.roomId]);

  const [isConnected, setIsConnected] = useState(false);

  const userId = session?.user.id;
  const nickname = session?.user.nickname;
  const avatar = session?.user.avatar;

  // Main effect: connection, notifications, presence
  useEffect(() => {
    if (!userId) return;

    if (!isLoaded) {
      getNotifications().then((res) => {
        if (res.ok) {
          setNotifications(
            res.data.notifications,
            res.data.unreadCount,
            res.data.hasMore,
          );
        }
      });
    }

    const realtime = new Ably.Realtime({
      authUrl: `/api/ably/token?clientId=${userId}`,
      autoConnect: true,
    });
    clientRef.current = realtime;

    realtime.connection.on("connected", () => {
      setIsConnected(true);
      console.log("[Ably Notification] Connected");
    });

    realtime.connection.on("disconnected", () => {
      setIsConnected(false);
    });

    // === 1. Subscribe to personal notification channel ===
    const notificationChannel = realtime.channels.get(
      `user-notification:${userId}`,
    );

    notificationChannel.subscribe(
      "room-created",
      async (message: Ably.Message) => {
        const payload = message.data as NotificationPayload;
        console.log("[Ably Notification] room-created:", payload);

        try {
          const members = await getRoomMembers(payload.room.id);
          addChatRoom(payload.room, members);
        } catch (error) {
          console.error(
            "[Ably Notification] Failed to fetch room members:",
            error,
          );
          addChatRoom(payload.room, payload.members);
        }
      },
    );

    // === 1a. Subscribe to new-notification (DB backed) ===
    notificationChannel.subscribe(
      "new-notification",
      (message: Ably.Message) => {
        const notification = message.data as Notification;
        console.log("[Ably Notification] new-notification:", notification);

        // Add to store
        addNotification(notification);

        // Show Toast based on type
        switch (notification.type) {
          case "room_invite":
            toast.info(
              `${notification.sender.nickname} 邀請你加入「${notification.room?.name || "聊天室"}」`,
            );

            break;
          case "post_like":
            toast.info(`${notification.sender.nickname} 按讚了你的貼文`);
            break;
          case "post_comment":
            toast.info(`${notification.sender.nickname} 回覆了你的貼文`);
            break;
        }
      },
    );

    // === 1c. Subscribe to chat-message ===
    notificationChannel.subscribe("chat-message", (message: Ably.Message) => {
      const payload = message.data as ChatMessagePayload;
      const currentActiveRoomId = activeRoomIdRef.current;
      console.log(
        "[Ably Notification] chat-message:",
        payload,
        "ActiveRoom:",
        currentActiveRoomId,
      );

      const { roomId, message: chatMessage } = payload;

      // Update last message
      updateRoomLastMessage(roomId, chatMessage);
      const members = useChatStore
        .getState()
        .chatCategorys.find((cat) =>
          cat.items.some((item) => item.room?.id === roomId),
        )
        ?.items.find((item) => item.room?.id === roomId)?.members;
      const current = members?.find((m) => m.user.id === userId);

      // If not in this room, increment unread count
      if (currentActiveRoomId !== roomId) {
        incrementUnreadCount(roomId);
        if (
          (current?.notificationSetting === "mentions" &&
            isMentioned(chatMessage?.content ?? "", userId)) ||
          current?.notificationSetting === "all"
        ) {
          MessageToast(chatMessage);
        }
      }
    });

    // === 1b. Subscribe to member-role-updated events ===
    notificationChannel.subscribe(
      "member-role-updated",
      (message: Ably.Message) => {
        const payload = message.data as MemberRoleUpdatedPayload;
        console.log("[Ably Notification] member-role-updated:", payload);
        window.dispatchEvent(
          new CustomEvent("member-role-updated", { detail: payload }),
        );
      },
    );

    // === 1c. Subscribe to room-info-updated events ===
    notificationChannel.subscribe(
      "room-info-updated",
      (message: Ably.Message) => {
        const payload = message.data as RoomInfoUpdatedPayload;
        console.log("[Ably Notification] room-info-updated:", payload);
        window.dispatchEvent(
          new CustomEvent("room-info-updated", { detail: payload }),
        );
      },
    );

    // === Load privacy settings into store ===
    const privacyStore = usePrivacyStore.getState();
    if (!privacyStore.isLoaded) {
      getPrivacySettings()
        .then((data) => {
          if (data) {
            usePrivacyStore.getState().setSettings(data);
          }
        })
        .catch((err) => {
          console.error("[Privacy] Failed to load settings:", err);
        });
    }

    // === 2. Global Presence ===
    const presenceChannel = realtime.channels.get(GLOBAL_PRESENCE_CHANNEL);

    // Respect showOnlineStatus privacy setting
    const enterPresence = () => {
      const { showOnlineStatus } = usePrivacyStore.getState().settings;
      if (showOnlineStatus) {
        presenceChannel.presence.enter({
          userId,
          nickname: nickname || userId,
          avatar: avatar || null,
        });
      }
    };
    enterPresence();

    // Listen for privacy settings changes to toggle presence on/off
    const handlePrivacyChange = () => {
      const { showOnlineStatus } = usePrivacyStore.getState().settings;
      if (showOnlineStatus) {
        presenceChannel.presence.enter({
          userId,
          nickname: nickname || userId,
          avatar: avatar || null,
        });
      } else {
        presenceChannel.presence.leave().catch(() => {});
      }
    };

    // Subscribe to store changes
    const unsubscribePrivacy = usePrivacyStore.subscribe((state, prevState) => {
      if (
        state.settings.showOnlineStatus !== prevState.settings.showOnlineStatus
      ) {
        handlePrivacyChange();
      }
    });

    const syncPresence = async () => {
      try {
        const members = await presenceChannel.presence.get();
        const users: OnlineUser[] = members.map((m) => ({
          clientId: m.clientId || "",
          userId: m.data?.id || m.clientId || "",
          nickname: m.data?.nickname || m.clientId || "",
          avatar: m.data?.avatar || undefined,
        }));
        setOnlineUsers(users);
      } catch (err) {
        console.error("[Ably Presence] Failed to sync presence:", err);
      }
    };

    presenceChannel.presence.subscribe("enter", () => syncPresence());
    presenceChannel.presence.subscribe("leave", () => syncPresence());
    presenceChannel.presence.subscribe("update", () => syncPresence());

    syncPresence();

    return () => {
      presenceChannel.presence.leave().catch(() => {});
      presenceChannel.presence.unsubscribe();
      notificationChannel.unsubscribe();
      unsubscribePrivacy();
      realtime.connection.off();
      realtime.close();
      clientRef.current = null;
      setIsConnected(false);
    };
  }, [userId, nickname, avatar, addChatRoom, setOnlineUsers, addNotification]);

  // === 3. Subscribe to typing channels for all rooms ===
  useEffect(() => {
    const realtime = clientRef.current;
    if (!realtime || !userId) return;

    // Collect all room IDs from chatCategorys
    const allRoomIds: string[] = [];
    chatCategorys.forEach((cat) => {
      cat.items.forEach((item) => {
        if (item.room?.id) {
          allRoomIds.push(item.room.id);
        }
      });
    });

    const currentChannels = typingChannelsRef.current;
    const newChannelKeys = new Set(allRoomIds);

    // Unsubscribe from channels no longer needed
    currentChannels.forEach((channel, key) => {
      if (!newChannelKeys.has(key)) {
        channel.unsubscribe();
        currentChannels.delete(key);
      }
    });

    // Subscribe to new channels
    allRoomIds.forEach((roomMongoId) => {
      if (currentChannels.has(roomMongoId)) return;

      const channel = realtime.channels.get(`room-typing:${roomMongoId}`);

      channel.subscribe("typing", (message: Ably.Message) => {
        const data = message.data as { userId: string; nickname: string };
        // Ignore own typing
        if (data.userId === userId) return;
        setUserTyping(roomMongoId, {
          id: data.userId,
          nickname: data.nickname,
        });
      });

      channel.subscribe("stop-typing", (message: Ably.Message) => {
        const data = message.data as { userId: string };
        clearUserTyping(roomMongoId, data.userId);
      });

      currentChannels.set(roomMongoId, channel);
    });

    return () => {
      // Cleanup will happen in the next effect run or unmount
    };
  }, [chatCategorys, userId, isConnected, setUserTyping, clearUserTyping]);

  // Cleanup typing channels on unmount
  useEffect(() => {
    return () => {
      typingChannelsRef.current.forEach((channel) => {
        channel.unsubscribe();
      });
      typingChannelsRef.current.clear();
    };
  }, []);

  return { isConnected };
}
