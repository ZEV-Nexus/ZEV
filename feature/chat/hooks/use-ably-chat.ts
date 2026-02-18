import { useEffect, useState, useCallback, useRef } from "react";
import * as Ably from "ably";
import { ChatClient, Room } from "@ably/chat";
import { Message } from "@/shared/types";

interface UseAblyChatProps {
  roomId: string;
  userId: string;
  nickname: string;
  onMessage?: (message: Message) => void;
  onTypingChange?: (typers: Set<string>) => void;
}

export function useAblyChat({
  roomId,
  userId,
  nickname,
  onMessage,
  onTypingChange,
}: UseAblyChatProps) {
  const [chatClient, setChatClient] = useState<ChatClient | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const realtimeRef = useRef<Ably.Realtime | null>(null);
  const [connectionState, setConnectionState] =
    useState<Ably.ConnectionState>("initialized");

  // Initialize Client
  useEffect(() => {
    const realtime = new Ably.Realtime({
      authUrl: `/api/ably/token?clientId=${userId}`,
      autoConnect: true,
      echoMessages: false,
    });

    const client = new ChatClient(realtime);
    setChatClient(client);
    realtimeRef.current = realtime;

    realtime.connection.on((state) => {
      setConnectionState(state.current);
    });

    return () => {
      realtime.connection.off();
      realtime.close();
    };
  }, [userId]);

  useEffect(() => {
    if (!chatClient || !roomId) return;

    let roomInstance: Room | null = null;
    let unsubscribeMessages: (() => void) | undefined;
    let unsubscribeTyping: (() => void) | undefined;

    const initRoom = async () => {
      try {
        console.log(`Joining Ably room: ${roomId}`);
        roomInstance = await chatClient.rooms.get(roomId, {});
        await roomInstance.attach();
        setRoom(roomInstance);

        // --- Messages ---
        const { unsubscribe: unsubMsg } = roomInstance.messages.subscribe(
          (msg: any) => {
            console.log("Ably received message:", msg);
            const payload = msg.message || msg;
            if (payload.metadata && payload.metadata.dbMessage && onMessage) {
              onMessage(payload.metadata.dbMessage as Message);
            }
          },
        );
        unsubscribeMessages = unsubMsg;

        // --- Typing ---
        const { unsubscribe: unsubTyping } = roomInstance.typing.subscribe(
          (event) => {
            console.log("Ably typing event:", event);

            let typers = new Set<string>();
            const current = event.currentlyTyping;

            if (current) {
              typers = current;
            }

            if (onTypingChange) {
              onTypingChange(typers);
            }
          },
        );
        unsubscribeTyping = unsubTyping;
      } catch (error) {
        console.error("Failed to init Ably room:", error);
      }
    };

    initRoom();

    return () => {
      if (roomInstance) {
        try {
          if (unsubscribeMessages) unsubscribeMessages();
          if (unsubscribeTyping) unsubscribeTyping();
          chatClient.rooms.release(roomId);
        } catch (e) {
          console.error("Error during cleanup", e);
        }
      }
    };
  }, [chatClient, roomId, nickname]);

  const sendRealtimeMessage = useCallback(
    async (content: string, dbMessage: Message) => {
      if (!room) return;
      try {
        console.log("Publishing to Ably:", content);
        await room.messages.send({
          text: content,
          metadata: { dbMessage: dbMessage as any },
        });
      } catch (e) {
        console.error("Publish error", e);
      }
    },
    [room],
  );

  const startTyping = useCallback(async () => {
    if (room) {
      try {
        await room.typing.keystroke();
      } catch (e) {
        console.error("Typing start error", e);
      }
    }
    // Also publish to raw channel for sidebar typing indicator
    if (realtimeRef.current) {
      try {
        const channel = realtimeRef.current.channels.get(
          `room-typing:${roomId}`,
        );
        channel.publish("typing", { userId, nickname });
      } catch (e) {
        // Silently ignore
      }
    }
  }, [room, roomId, userId, nickname]);

  const stopTyping = useCallback(async () => {
    if (room) {
      try {
        await room.typing.stop();
      } catch (e) {
        console.error("Typing stop error", e);
      }
    }
    // Also publish stop to raw channel
    if (realtimeRef.current) {
      try {
        const channel = realtimeRef.current.channels.get(
          `room-typing:${roomId}`,
        );
        channel.publish("stop-typing", { userId });
      } catch (e) {
        // Silently ignore
      }
    }
  }, [room, roomId, userId]);

  return {
    connectionState,
    sendRealtimeMessage,
    startTyping,
    stopTyping,
    isConnected: connectionState === "connected",
  };
}
