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
import { useAIStore } from "@/shared/store/ai-store";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

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
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const MESSAGE_LIMIT = 50;

  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const { updateRoomLastMessage, setCurrentRoom } = useChatStore();
  const { selectedModel, setSelectedModel, maskedKeys } = useAIStore();
  const t = useTranslations("chat");

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
      setLocalMessages((prev) => {
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
  // Fetch messages with useQuery — cached per room, background refetch on revisit
  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["room-messages", room.id],
    queryFn: async () => {
      const data = await fetchMessages(room.id, MESSAGE_LIMIT);
      return data ?? [];
    },
    staleTime: 30 * 1000, // 30s 內視為新鮮，不重新拉取
    gcTime: 10 * 60 * 1000, // 快取保留 10 分鐘
  });

  useEffect(() => {
    if (messagesData) {
      setLocalMessages(messagesData);
      setHasMoreMessages(messagesData.length >= MESSAGE_LIMIT);
    }
  }, [messagesData]);

  // Load older messages for infinite scroll
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMoreMessages || localMessages.length === 0) return;
    setIsLoadingMore(true);
    try {
      const oldestMessage = localMessages[0];
      const data = await fetchMessages(
        room.id,
        MESSAGE_LIMIT,
        oldestMessage.createdAt,
      );
      if (data && data.length > 0) {
        setLocalMessages((prev) => [...data, ...prev]);
        setHasMoreMessages(data.length >= MESSAGE_LIMIT);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error: unknown) {
      console.log(error);
      toast.error(t("loadMoreFailed"));
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
      handleSendToAI(content, attachments);
      return;
    }

    if (!currentMember) {
      toast.error(t("memberNotFound"));
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

    setLocalMessages((prev) => [...prev, optimisticMessage]);
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
        setLocalMessages((prev) =>
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
      setLocalMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id),
      );
      toast.error(error instanceof Error ? error.message : t("sendFailed"));
    } finally {
      stopTyping();
    }
  };

  const handleSendToAI = async (content: string, files?: File[]) => {
    if (!content.trim() || status === "streaming") return;
    const aiMessage = { text: content, role: "user" };

    const modelKeyId = maskedKeys[selectedModel.provider].id;

    // Upload files and collect attachment metadata for AI agents
    let attachmentMeta: Array<{
      url: string;
      filename: string;
      mimeType: string;
      size: number;
      resourceType?: string;
    }> = [];

    if (files && files.length > 0) {
      try {
        const uploaded = await Promise.all(
          files.map((file) => uploadFileToCloudinary(file)),
        );
        attachmentMeta = uploaded.map((u, i) => ({
          url: (u as unknown as { url: string }).url,
          filename: files[i].name,
          mimeType: files[i].type,
          size: files[i].size,
          resourceType: files[i].type.startsWith("image/")
            ? "image"
            : files[i].type.startsWith("video/")
              ? "video"
              : "raw",
        }));
      } catch {
        toast.error(t("uploadFailed"));
      }
    }

    sendAiMessage(aiMessage, {
      body: {
        modelKeyId,
        modelId: selectedModel.id,
        roomId: room.id,
        ...(attachmentMeta.length > 0 ? { attachments: attachmentMeta } : {}),
      },
    });
  };

  const handleToggleAIPanel = () => {
    setIsAIPanelOpen(!isAIPanelOpen);
  };

  const handleClearAI = () => {
    setAiMessages([]);
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    // Optimistic update
    setLocalMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content, editedAt: new Date().toISOString() }
          : msg,
      ),
    );

    try {
      await editMessageApi(messageId, content);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("editFailed"));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    // Optimistic update
    setLocalMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, deletedAt: new Date().toISOString() }
          : msg,
      ),
    );

    try {
      await deleteMessageApi(messageId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("deleteFailed"));
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
            {isLoadingMessages && localMessages.length === 0 ? (
              <div className="flex items-start justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <RiLoader2Line className=" animate-spin rounded-full " />
                </div>
              </div>
            ) : (
              <>
                <ChatMessageList
                  roomId={room.id}
                  messages={localMessages}
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
                        {t("typingIndicator", { count: typingUsers.size })}
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
                onSelectModel={setSelectedModel}
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
          members={members}
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
