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

export default function NavRoomItem({ item }: { item: ChatNavItem }) {
  const { data: session } = useSession();
  const { members, room } = item;
  const recipient = members?.find(
    (member) => member.user.userId !== session?.user?.userId,
  )?.user;
  const currentUser = members?.find(
    (member) => member.user.userId === session?.user?.userId,
  );
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
          className="px-3 py-2 h-fit flex w-full   justify-between hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
        >
          <div className="flex gap-2">
            <Avatar>
              <AvatarBadge className="bg-green-500  h-2 w-2 right-0 bottom-0" />
              <AvatarFallback className="rounded-lg">
                {room.roomType === "dm"
                  ? recipient?.nickname?.charAt(0)
                  : (room?.name?.charAt(0) ?? "")}
              </AvatarFallback>
            </Avatar>
            <span className=" self-start    justify-items-start">
              <p>
                {room.roomType === "dm"
                  ? recipient?.nickname
                  : (room?.name ?? "")}
              </p>
              {room.lastMessage && (
                <p className="text-xs text-muted-foreground">
                  {room.lastMessage.member.user.nickname}:
                  {room.lastMessage.content}
                </p>
              )}
            </span>
          </div>
          {currentUser?.pinned && (
            <RiPushpinLine className="text-muted-foreground" />
          )}
          {item.unreadCount && (
            <Badge className="text-xs">{item.unreadCount}</Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
