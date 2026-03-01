"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Message, Member } from "@/shared/types";
import { ChatMessageItem, BubblePosition } from "./chat-message-item";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { cn } from "@/shared/shadcn/lib/utils";
import { RiArrowDownLine, RiLoader2Line } from "@remixicon/react";
import { useChatStore } from "@/shared/store/chat-store";
import { markAsRead } from "@/shared/service/api/message";
import { useTranslations } from "next-intl";
import { useLocaleStore } from "@/shared/store/locale-store";

interface ChatMessageListProps {
  roomId: string;
  messages: Message[];
  currentUserId: string;
  members: Member[];
  isAIPanelOpen?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyMessage?: (message: Message) => void;
}

// Grouping threshold: 5 minutes
const GROUP_THRESHOLD_MS = 5 * 60 * 1000;

// Item types for the virtualized list
type ListItem =
  | { type: "date-separator"; date: Date; key: string }
  | {
      type: "message";
      message: Message;
      isCurrentUser: boolean;
      showAvatar: boolean;
      showName: boolean;
      showTimestamp: boolean;
      bubblePosition: BubblePosition;
      key: string;
    };

function formatDateSeparator(
  date: Date,
  t: (key: string) => string,
  locale: string,
): string {
  if (isToday(date)) return t("today");
  if (isYesterday(date)) return t("yesterday");
  if (locale === "zh-TW") {
    return format(date, "yyyy年M月d日 EEEE", { locale: zhTW });
  }
  return format(date, "EEEE, MMMM d, yyyy");
}

export function ChatMessageList({
  roomId,
  messages,
  currentUserId,
  members,
  isAIPanelOpen,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
}: ChatMessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);

  const { clearUnreadCount, unreadCounts } = useChatStore();
  const t = useTranslations("chat");
  const currentLocale = useLocaleStore((s) => s.locale);
  const prevAtBottom = useRef(atBottom);
  const unreadCount = atBottom ? 0 : unreadCounts[roomId] || 0;
  const START_INDEX = 100000;
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
  const prevListItemsLenRef = useRef<number>(0);
  const wasLoadingMoreRef = useRef(false);

  const listItems = useMemo<ListItem[]>(() => {
    if (messages.length === 0) return [];

    const items: ListItem[] = [];
    let prevDate: Date | null = null;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const msgDate = new Date(msg.createdAt);

      if (!prevDate || !isSameDay(prevDate, msgDate)) {
        items.push({
          type: "date-separator",
          date: msgDate,
          key: `date-${msgDate.toDateString()}`,
        });
      }
      prevDate = msgDate;

      const isCurrentUser =
        msg.member?.user?.id === currentUserId ||
        msg.memberId === currentUserId;

      // Grouping: same member && timestamp diff < 5min
      const prevMsg = i > 0 ? messages[i - 1] : null;
      const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;

      const sameAsPrev =
        prevMsg &&
        prevMsg.member?.user?.id === msg.member?.user?.id &&
        isSameDay(new Date(prevMsg.createdAt), msgDate) &&
        msgDate.getTime() - new Date(prevMsg.createdAt).getTime() <
          GROUP_THRESHOLD_MS;

      const sameAsNext =
        nextMsg &&
        nextMsg.member?.user?.id === msg.member?.user?.id &&
        isSameDay(new Date(nextMsg.createdAt), msgDate) &&
        new Date(nextMsg.createdAt).getTime() - msgDate.getTime() <
          GROUP_THRESHOLD_MS;

      const isFirst = !sameAsPrev;
      const isLast = !sameAsNext;

      let bubblePosition: BubblePosition = "single";
      if (isFirst && isLast) bubblePosition = "single";
      else if (isFirst) bubblePosition = "first";
      else if (isLast) bubblePosition = "last";
      else bubblePosition = "middle";

      items.push({
        type: "message",
        message: msg,
        isCurrentUser,
        showAvatar: isFirst,
        showName: isFirst,
        showTimestamp: isLast,
        bubblePosition,
        key: msg.id,
      });
    }

    return items;
  }, [messages, currentUserId]);

  useEffect(() => {
    const prevLen = prevListItemsLenRef.current;
    const newLen = listItems.length;

    if (wasLoadingMoreRef.current && !isLoadingMore && newLen > prevLen) {
      const diff = newLen - prevLen;
      setFirstItemIndex((prev) => prev - diff);
    }

    wasLoadingMoreRef.current = isLoadingMore;
    prevListItemsLenRef.current = newLen;
  }, [listItems, isLoadingMore]);

  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  const handleScrollToMessage = useCallback(
    (messageId: string) => {
      const idx = listItems.findIndex(
        (item) => item.type === "message" && item.message.id === messageId,
      );
      if (idx !== -1) {
        virtuosoRef.current?.scrollToIndex({
          index: idx,
          align: "center",
          behavior: "smooth",
        });
      }
    },
    [listItems],
  );

  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollTo({
      top: 999999, // Force scroll to absolute bottom
      behavior: "smooth",
    });
  }, []);

  const handleMarkAsRead = useCallback((roomId: string) => {
    markAsRead(roomId);
  }, []);

  // Mark as read when messages update and we are at bottom
  useEffect(() => {
    if (atBottom && messages.length > 0) {
      clearUnreadCount(roomId);
      handleMarkAsRead(roomId);
    }

    prevAtBottom.current = atBottom;
  }, [messages, atBottom, roomId, clearUnreadCount, handleMarkAsRead]);

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8"></div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Virtuoso
        className="h-full w-full"
        id="chat-message-list"
        ref={virtuosoRef}
        data={listItems}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={{
          index: listItems.length - 1,
          align: "end",
        }}
        startReached={handleStartReached}
        followOutput={atBottom ? "auto" : false}
        atBottomThreshold={200}
        atBottomStateChange={(bottom) => {
          setAtBottom(bottom);
          if (bottom) {
            clearUnreadCount(roomId);
            handleMarkAsRead(roomId);
            prevAtBottom.current = atBottom;
          }
        }}
        components={{
          Header: () =>
            isLoadingMore ? (
              <div className="flex items-center justify-center py-3">
                <RiLoader2Line className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">
                  {t("loadingMore")}
                </span>
              </div>
            ) : null,
          Footer: () =>
            isAIPanelOpen ? (
              <div className="h-75 transition-all duration-300" />
            ) : null,
        }}
        increaseViewportBy={{ top: 400, bottom: 0 }}
        itemContent={(_, item) => {
          if (item.type === "date-separator") {
            return (
              <div className="flex items-center justify-center py-4 px-6 animate-in fade-in duration-200">
                <div className="px-3 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground font-medium">
                  {formatDateSeparator(item.date, t, currentLocale)}
                </div>
              </div>
            );
          }

          return (
            <div className="animate-in fade-in duration-200">
              <ChatMessageItem
                message={item.message}
                isCurrentUser={item.isCurrentUser}
                showAvatar={item.showAvatar}
                showName={item.showName}
                showTimestamp={item.showTimestamp}
                bubblePosition={item.bubblePosition}
                members={members}
                onScrollToMessage={handleScrollToMessage}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
                onReplyMessage={onReplyMessage}
              />
            </div>
          );
        }}
      />

      {!atBottom && (
        <button
          onClick={scrollToBottom}
          className={cn(
            "absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-full",
            "bg-background/90 backdrop-blur-sm shadow-lg border border-border/50",
            "hover:bg-background transition-colors cursor-pointer",
            "animate-in fade-in slide-in-from-bottom-2 duration-200",
          )}
        >
          <RiArrowDownLine className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="text-xs font-medium text-primary">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
