"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { Message, Member } from "@/shared/types";
import { ChatMessageItem, BubblePosition } from "./chat-message-item";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { cn } from "@/shared/shadcn/lib/utils";
import { RiArrowDownLine } from "@remixicon/react";
interface ChatMessageListProps {
  messages: Message[];
  currentUserId: string;
  members: Member[];
  isAIPanelOpen?: boolean;
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

function formatDateSeparator(date: Date): string {
  if (isToday(date)) return "今天";
  if (isYesterday(date)) return "昨天";
  return format(date, "yyyy年M月d日 EEEE", { locale: zhTW });
}

export function ChatMessageList({
  messages,
  currentUserId,
  isAIPanelOpen,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
}: ChatMessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

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
        msg.member?.user?.userId === currentUserId ||
        msg.memberId === currentUserId;

      // Grouping: same member && timestamp diff < 5min
      const prevMsg = i > 0 ? messages[i - 1] : null;
      const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;

      const sameAsPrev =
        prevMsg &&
        prevMsg.member?.user?.userId === msg.member?.user?.userId &&
        isSameDay(new Date(prevMsg.createdAt), msgDate) &&
        msgDate.getTime() - new Date(prevMsg.createdAt).getTime() <
          GROUP_THRESHOLD_MS;

      const sameAsNext =
        nextMsg &&
        nextMsg.member?.user?.userId === msg.member?.user?.userId &&
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
    virtuosoRef.current?.scrollToIndex({
      index: listItems.length - 1,
      align: "end",
      behavior: "smooth",
    });
    setUnreadCount(0);
  }, [listItems.length]);

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8"></div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Virtuoso
        ref={virtuosoRef}
        data={listItems}
        initialTopMostItemIndex={listItems.length - 1}
        followOutput="smooth"
        atBottomStateChange={(bottom) => {
          setAtBottom(bottom);
          if (bottom) setUnreadCount(0);
        }}
        components={{
          Footer: () => (
            <div
              className={cn(
                "transition-all duration-300",
                isAIPanelOpen ? "h-[300px]" : "h-4",
              )}
            />
          ),
        }}
        increaseViewportBy={{ top: 400, bottom: 200 }}
        itemContent={(_, item) => {
          if (item.type === "date-separator") {
            return (
              <div className="flex items-center justify-center py-4 px-6">
                <div className="px-3 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground font-medium">
                  {formatDateSeparator(item.date)}
                </div>
              </div>
            );
          }

          return (
            <ChatMessageItem
              message={item.message}
              isCurrentUser={item.isCurrentUser}
              showAvatar={item.showAvatar}
              showName={item.showName}
              showTimestamp={item.showTimestamp}
              bubblePosition={item.bubblePosition}
              onScrollToMessage={handleScrollToMessage}
              onEditMessage={onEditMessage}
              onDeleteMessage={onDeleteMessage}
              onReplyMessage={onReplyMessage}
            />
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
