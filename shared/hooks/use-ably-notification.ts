"use client";

import { useEffect, useRef, useState } from "react";
import * as Ably from "ably";
import { useSession } from "next-auth/react";
import { useChatStore } from "@/shared/store/chat-store";
import { useOnlineStore, OnlineUser } from "@/shared/store/online-store";
import { useTypingStore } from "@/shared/store/typing-store";
import { ChatRoom, Member } from "@/shared/types";
import { toast } from "sonner";
import { getRoomMembers } from "@/shared/service/api/room";

// Notification event types
export type NotificationType =
  | "room-created"
  | "room-invited"
  | "member-role-updated";

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
  const { addChatRoom, chatCategorys } = useChatStore();
  const { setOnlineUsers } = useOnlineStore();
  const { setUserTyping, clearUserTyping } = useTypingStore();
  const clientRef = useRef<Ably.Realtime | null>(null);
  const typingChannelsRef = useRef<Map<string, Ably.RealtimeChannel>>(
    new Map(),
  );
  const [isConnected, setIsConnected] = useState(false);

  const userId = session?.user?.userId;
  const nickname = session?.user?.nickname;
  const avatar = session?.user?.avatar;

  // Main effect: connection, notifications, presence
  useEffect(() => {
    if (!userId) return;

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
          toast.success(
            `${payload.inviter.nickname} 邀請你加入「${payload.room.name || "新聊天"}」`,
          );
        } catch (error) {
          console.error(
            "[Ably Notification] Failed to fetch room members:",
            error,
          );
          addChatRoom(payload.room, payload.members);
          toast.success(
            `${payload.inviter.nickname} 邀請你加入「${payload.room.name || "新聊天"}」`,
          );
        }
      },
    );

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

    // === 2. Global Presence ===
    const presenceChannel = realtime.channels.get(GLOBAL_PRESENCE_CHANNEL);

    presenceChannel.presence.enter({
      userId,
      nickname: nickname || userId,
      avatar: avatar || null,
    });

    const syncPresence = async () => {
      try {
        const members = await presenceChannel.presence.get();
        const users: OnlineUser[] = members.map((m) => ({
          clientId: m.clientId || "",
          userId: (m.data as any)?.userId || m.clientId || "",
          nickname: (m.data as any)?.nickname || m.clientId || "",
          avatar: (m.data as any)?.avatar || undefined,
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
      realtime.connection.off();
      realtime.close();
      clientRef.current = null;
      setIsConnected(false);
    };
  }, [userId, nickname, avatar, addChatRoom, setOnlineUsers]);

  // === 3. Subscribe to typing channels for all rooms ===
  useEffect(() => {
    const realtime = clientRef.current;
    if (!realtime || !userId) return;

    // Collect all room IDs from chatCategorys
    const allRoomIds: { roomId: string; roomMongoId: string }[] = [];
    chatCategorys.forEach((cat) => {
      cat.items.forEach((item) => {
        if (item.room?.roomId) {
          allRoomIds.push({
            roomId: item.room.roomId,
            roomMongoId: item.room.id || item.id,
          });
        }
      });
    });

    const currentChannels = typingChannelsRef.current;
    const newChannelKeys = new Set(allRoomIds.map((r) => r.roomMongoId));

    // Unsubscribe from channels no longer needed
    currentChannels.forEach((channel, key) => {
      if (!newChannelKeys.has(key)) {
        channel.unsubscribe();
        currentChannels.delete(key);
      }
    });

    // Subscribe to new channels
    allRoomIds.forEach(({ roomMongoId }) => {
      if (currentChannels.has(roomMongoId)) return;

      const channel = realtime.channels.get(`room-typing:${roomMongoId}`);

      channel.subscribe("typing", (message: Ably.Message) => {
        const data = message.data as { userId: string; nickname: string };
        // Ignore own typing
        if (data.userId === userId) return;
        setUserTyping(roomMongoId, {
          userId: data.userId,
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
