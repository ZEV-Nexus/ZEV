"use client";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
} from "@/shared/shadcn/components/ui/avatar";
import { Badge } from "@/shared/shadcn/components/ui/badge";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/shadcn/components/ui/sidebar";
import { ChatNavItem } from "@/shared/types";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { RiPushpinLine } from "@remixicon/react";
import { Skeleton } from "@/shared/shadcn/components/ui/skeleton";
import { cn } from "@/shared/shadcn/lib/utils";
import { useTypingStore } from "@/shared/store/typing-store";
import { useOnlineStore } from "@/shared/store/online-store";
import { useAblyChat } from "../hooks/use-ably-chat";
import { useChatStore } from "@/shared/store/chat-store";
import { parseMentions } from "@/shared/lib/mention";
import { Mention } from "@/shared/shadcn/components/ui/mention";
import { MentionText } from "./mention-text";

export function NavRoomItemSkeleton() {
  return (
    <SidebarMenuItem>
      <div className="px-3 py-2 h-fit flex w-full justify-between rounded-md">
        <div className="flex gap-2 w-full overflow-hidden">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex flex-col gap-1.5 justify-center flex-1 min-w-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    </SidebarMenuItem>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-0.5">
      <span className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
      <span className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
      <span className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

export default function NavRoomItem({ item }: { item: ChatNavItem }) {
  const { data: session } = useSession();
  const { members, room } = item;
  const recipient = members?.find(
    (member) => member.user.userId !== session?.user?.userId,
  )?.user;
  const currentUser = members?.find(
    (member) => member.user.userId === session?.user?.userId,
  );
  const { updateRoomLastMessage, incrementUnreadCount, currentRoom } =
    useChatStore();

  // Get typing users for this room (excluding self)
  const typingByRoom = useTypingStore((s) => s.typingByRoom);
  const roomTypingMap = typingByRoom.get(room.id);
  const filteredTypers = roomTypingMap
    ? Array.from(roomTypingMap.values()).filter(
        (t) => t.userId !== session?.user?.userId,
      )
    : [];

  // Get online status for DM recipient
  const { onlineUsers } = useOnlineStore();
  const isRecipientOnline =
    room.roomType === "dm" && recipient
      ? onlineUsers.has(recipient.userId)
      : false;

  useAblyChat({
    roomId: room.id,
    userId: session?.user?.userId || "",
    nickname: session?.user?.nickname || "",
    onMessage: (message) => {
      updateRoomLastMessage(room.id, message);
      if (
        message.member.user.userId !== session?.user?.userId &&
        currentRoom?.id !== room.id
      ) {
        incrementUnreadCount(room.id);
      }
    },
  });

  return (
    <SidebarMenuItem key={item.id}>
      <SidebarMenuButton
        tooltip={
          room.roomType === "dm" ? recipient?.nickname : (room?.name ?? "")
        }
        asChild
      >
        <Link
          href={`/c/${room?.roomId}`}
          className="px-3 py-2 h-fit flex min-w-0 w-full overflow-hidden justify-between hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
        >
          <div className="flex gap-2 flex-1 min-w-0 overflow-hidden">
            <Avatar>
              {isRecipientOnline && (
                <AvatarBadge className="bg-green-500  h-2 w-2 right-0 bottom-0" />
              )}
              <AvatarFallback className="rounded-lg">
                {room.roomType === "dm"
                  ? recipient?.nickname?.charAt(0)
                  : (room?.name?.charAt(0) ?? "")}
              </AvatarFallback>
            </Avatar>
            <div className="self-start min-w-0 flex-1 overflow-hidden">
              <p className="truncate">
                {room.roomType === "dm"
                  ? recipient?.nickname
                  : (room?.name ?? "")}
              </p>
              {filteredTypers.length > 0 ? (
                <p className="text-xs text-primary font-medium flex items-center truncate">
                  {filteredTypers.length === 1
                    ? `${filteredTypers[0].nickname} 正在輸入`
                    : `${filteredTypers.length} 人正在輸入`}

                  <TypingDots />
                </p>
              ) : (
                room.lastMessage && (
                  <p
                    className={cn(
                      "text-xs text-muted-foreground truncate",
                      item.unreadCount && item.unreadCount > 0
                        ? "font-bold"
                        : "",
                    )}
                  >
                    {room.lastMessage.member.user.id === session?.user?.id
                      ? "你: "
                      : room.lastMessage.member.user.nickname
                        ? `${room.lastMessage.member.user.nickname}: `
                        : ""}
                    {room.lastMessage?.attachments?.length &&
                    room.lastMessage?.attachments?.length > 0 ? (
                      room.lastMessage.attachments?.[0].filename
                    ) : (
                      <MentionText
                        content={room.lastMessage?.content || ""}
                        members={members!}
                        className=" pointer-events-none"
                      />
                    )}
                  </p>
                )
              )}
            </div>
          </div>
          {currentUser?.pinned && (
            <RiPushpinLine className="text-muted-foreground" />
          )}
          {item?.unreadCount && item.unreadCount > 0 ? (
            <Badge className="text-xs">{item.unreadCount}</Badge>
          ) : (
            <div className="w-4" />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
