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

import { MentionText } from "./mention-text";
import { useTranslations } from "next-intl";

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
    (member) => member.user.id !== session?.user?.id,
  )?.user;
  const currentUser = members?.find(
    (member) => member.user.id === session?.user?.id,
  );

  const t = useTranslations("chat");

  const typingByRoom = useTypingStore((s) => s.typingByRoom);
  const roomTypingMap = typingByRoom.get(room.id);
  const filteredTypers = roomTypingMap
    ? Array.from(roomTypingMap.values()).filter(
        (t) => t.id !== session?.user?.id,
      )
    : [];

  const { onlineUsers } = useOnlineStore();
  const isRecipientOnline =
    room.roomType === "dm" && recipient ? onlineUsers.has(recipient.id) : false;

  return (
    <SidebarMenuItem key={item.id} className=" border-none overflow-hidden">
      <SidebarMenuButton
        tooltip={
          room.roomType === "dm" ? recipient?.nickname : (room?.name ?? "")
        }
        asChild
      >
        <Link
          href={`/c/${room.id}`}
          className="px-3 py-2 h-fit border-none  flex min-w-0 max-w-full overflow-hidden justify-between hover:bg-gray-100 dark:hover:bg-gray-800  hover:rounded-xl "
        >
          <div className="flex gap-2 flex-1 min-w-0 overflow-hidden  ">
            <Avatar>
              {isRecipientOnline && (
                <AvatarBadge className="bg-green-500  h-2 w-2 right-0 bottom-0" />
              )}
              <AvatarFallback className="rounded-full">
                {room.roomType === "dm"
                  ? recipient?.nickname?.charAt(0)
                  : (room?.name?.charAt(0) ?? "")}
              </AvatarFallback>
            </Avatar>
            <div className="self-start min-w-0 flex-1 overflow-hidden w-0">
              <p className="truncate">
                {room.roomType === "dm"
                  ? recipient?.nickname
                  : (room?.name ?? "")}
              </p>
              {filteredTypers.length > 0 ? (
                <p className="text-xs text-primary font-medium flex items-center truncate">
                  {filteredTypers.length === 1
                    ? `${filteredTypers[0].nickname} ${t("typing", { name: "" }).trim()}`
                    : t("typingMultiple", { count: filteredTypers.length })}

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
                      ? t("youPrefix")
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
                        className="pointer-events-none truncate"
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
