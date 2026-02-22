"use client";

import { useState, useEffect } from "react";
import { ChatRoomHeader } from "./chat-room-header";
import { ChatMessageList } from "./chat-message-list";
import { ChatMessageInput } from "./chat-message-input";
import { AIChatPanel } from "./ai-chat-panel";
import {
  ChatRoom as ChatRoomType,
  Member,
  Message,
  Attachment,
} from "@/shared/types";
import {
  sendMessage,
  editMessageApi,
  deleteMessageApi,
  fetchMessages,
} from "@/shared/service/api/message";
import { uploadFileToCloudinary } from "@/shared/service/api/upload";
import { toast } from "sonner";
import { IAttachment } from "@/shared/schema/attachment";
import { useChatStore } from "@/shared/store/chat-store";
import { useAblyChat } from "@/feature/chat/hooks/use-ably-chat";
import { RiLoader2Line } from "@remixicon/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

interface ChatRoomProps {
  room: ChatRoomType;
  members: Member[];
  currentUserId: string;
}

export default function ChatRoom({
  room,
  members,
  currentUserId,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const MESSAGE_LIMIT = 50;

  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const { updateRoomLastMessage, setCurrentRoom } = useChatStore();
  const [modelId, setModelId] = useState("claude-3-5-sonnet-20240620");
  const {
    messages: aiMessages,
    status,
    sendMessage: sendAiMessage,
    setMessages: setAiMessages,
  } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
    onError: (err: unknown) => {
      console.error(err);
      toast.error(
        "Failed to generate response. Check your API keys in Settings.",
      );
    },
  });

  console.log(status);

  const currentMember = members?.find((m) => m.user.userId === currentUserId);
  const nickname = currentMember?.user?.nickname || "Guest";
  useEffect(() => {
    setCurrentRoom(room);
  }, [room, setCurrentRoom]);
  const { sendRealtimeMessage, startTyping, stopTyping } = useAblyChat({
    roomId: room.id,
    userId: currentUserId,
    nickname,
    onMessage: (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    },
    onTypingChange: (typers) => {
      const others = new Set(typers);
      others.delete(currentUserId);
      setTypingUsers(others);
    },
  });
  // Fetch messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const data = await fetchMessages(room.id, MESSAGE_LIMIT);
        if (data) {
          setMessages(data);
          setHasMoreMessages(data.length >= MESSAGE_LIMIT);
        }
      } catch (error: unknown) {
        console.log(error);
        toast.error("訊息讀取失敗");
      } finally {
        setIsLoadingMessages(false);
      }
    };
    loadMessages();
  }, [room]);

  // Load older messages for infinite scroll
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMoreMessages || messages.length === 0) return;
    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const data = await fetchMessages(
        room.id,
        MESSAGE_LIMIT,
        oldestMessage.createdAt,
      );
      if (data && data.length > 0) {
        setMessages((prev) => [...data, ...prev]);
        setHasMoreMessages(data.length >= MESSAGE_LIMIT);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error: unknown) {
      console.log(error);
      toast.error("載入更多訊息失敗");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSendMessage = async (
    content: string,
    attachments?: File[],
    replyToId?: string,
  ) => {
    if (isAIPanelOpen) {
      handleSendToAI(content);
      return;
    }

    if (!currentMember) {
      toast.error("無法發送訊息：找不到成員資訊");
      return;
    }

    // Optimistic attachments
    const optimisticAttachments: Attachment[] = attachments
      ? attachments.map((file, i) => ({
          id: `temp-att-${Date.now()}-${i}`,
          url: URL.createObjectURL(file), // Helper for preview
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          publicId: "",
          resourceType: file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("video/")
              ? "video"
              : "raw",
          uploadedAt: new Date().toISOString(),
        }))
      : [];

    // Optimistic update - immediately show message in UI
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      room: room,
      roomId: room.id,
      member: currentMember,
      memberId: currentMember.id,
      content,
      createdAt: new Date().toISOString(),
      replyTo: replyToId,
      attachments: optimisticAttachments,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setReplyingMessage(null); // Clear reply state immediately

    try {
      // Upload files first
      let uploadedAttachments: IAttachment[] | undefined;
      if (attachments && attachments.length > 0) {
        const uploadPromises = attachments.map((file) =>
          uploadFileToCloudinary(file),
        );
        const results = await Promise.all(uploadPromises);
        uploadedAttachments = results as unknown as IAttachment[];
      }

      const savedMessage = await sendMessage(
        currentMember.id,
        room.id,
        content,
        uploadedAttachments,
        replyToId,
      );

      // Replace optimistic message with saved one
      if (savedMessage && typeof savedMessage === "object") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id
              ? { ...optimisticMessage, ...(savedMessage as Message) }
              : msg,
          ),
        );
        updateRoomLastMessage(room.id, savedMessage as Message);
        // Publish to Ably
        await sendRealtimeMessage(content, savedMessage as Message);
      }
    } catch (error: unknown) {
      // Remove optimistic message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id),
      );
      toast.error(
        error instanceof Error ? error.message : "訊息發送失敗，請重試",
      );
    } finally {
      stopTyping();
    }
  };

  const handleSendToAI = (content: string) => {
    if (!content.trim() || status === "streaming") return;
    const aiMessage = { text: content, role: "user" };
    sendAiMessage(aiMessage, { body: { modelId } });
  };

  const handleToggleAIPanel = () => {
    setIsAIPanelOpen(!isAIPanelOpen);
  };

  const handleClearAI = () => {
    setAiMessages([]);
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content, editedAt: new Date().toISOString() }
          : msg,
      ),
    );

    try {
      await editMessageApi(messageId, content);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "編輯失敗，請重試");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, deletedAt: new Date().toISOString() }
          : msg,
      ),
    );

    try {
      await deleteMessageApi(messageId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刪除失敗，請重試");
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-linear-to-br from-background via-background to-muted/20">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col h-full min-w-0">
        {/* Header */}
        <ChatRoomHeader
          room={room}
          members={members}
          currentUserId={currentUserId}
          onToggleAI={handleToggleAIPanel}
          isAIPanelOpen={isAIPanelOpen}
        />

        <div className="flex-1 overflow-hidden relative">
          <div className="h-full w-full relative">
            {isLoadingMessages ? (
              <div className="flex items-start justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <RiLoader2Line className=" animate-spin rounded-full " />
                </div>
              </div>
            ) : (
              <>
                <ChatMessageList
                  roomId={room.id}
                  messages={messages}
                  currentUserId={currentUserId}
                  members={members}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onReplyMessage={setReplyingMessage}
                  isAIPanelOpen={isAIPanelOpen}
                  hasMore={hasMoreMessages}
                  isLoadingMore={isLoadingMore}
                  onLoadMore={handleLoadMore}
                />
                {/* Typing Indicator Overlay */}
                {typingUsers.size > 0 && (
                  <div className="absolute bottom-4 left-4 z-10 animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-background/80 backdrop-blur-md text-xs px-3 py-1.5 rounded-full border shadow-xs flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                      </div>
                      <span className="text-muted-foreground">
                        {typingUsers.size} 人正在輸入...
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
            <div className="pointer-events-auto">
              <AIChatPanel
                isOpen={isAIPanelOpen}
                onToggle={handleToggleAIPanel}
                aiMessages={aiMessages}
                onSelectModel={setModelId}
                isLoading={status === "streaming" || status === "submitted"}
                onClear={handleClearAI}
              />
            </div>
          </div>
        </div>

        {/* Shared Input Area */}
        <ChatMessageInput
          onSendMessage={handleSendMessage}
          roomId={room.id}
          isAIMode={isAIPanelOpen}
          replyingMessage={replyingMessage}
          onCancelReply={() => setReplyingMessage(null)}
          onTyping={() => {
            startTyping();
          }}
        />
      </div>
    </div>
  );
}
