"use client";

import { useState, useEffect } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarBadge,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { Button } from "@/shared/shadcn/components/ui/button";
import { ChatRoom, Member } from "@/shared/types";
import {
  RiMoreLine,
  RiNotificationLine,
  RiSearchLine,
  RiSparklingLine,
  RiMenuLine,
} from "@remixicon/react";
import { Separator } from "@/shared/shadcn/components/ui/separator";
import { useSidebar } from "@/shared/shadcn/components/ui/sidebar";
import { ChatRoomSettingsPanel } from "./chat-room-settings-panel";
import { useOnlineStore } from "@/shared/store/online-store";
import { RoomInfoUpdatedPayload } from "@/shared/hooks/use-ably-notification";

interface ChatRoomHeaderProps {
  room: ChatRoom;
  members: Member[];
  currentUserId: string;
  onToggleAI: () => void;
  isAIPanelOpen: boolean;
}

export function ChatRoomHeader({
  room,
  members,
  currentUserId,
  onToggleAI,
  isAIPanelOpen,
}: ChatRoomHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localRoom, setLocalRoom] = useState<ChatRoom>(room);
  const { onlineUsers } = useOnlineStore();

  // Sync with prop changes
  useEffect(() => {
    setLocalRoom(room);
  }, [room]);

  // Listen for real-time room info updates
  useEffect(() => {
    const handleRoomInfoUpdate = (event: Event) => {
      const detail = (event as CustomEvent<RoomInfoUpdatedPayload>).detail;
      if (detail.roomId === room.roomId) {
        setLocalRoom((prev) => ({
          ...prev,
          ...(detail.name !== undefined && { name: detail.name }),
          ...(detail.avatar !== undefined && { avatar: detail.avatar }),
        }));
      }
    };

    window.addEventListener("room-info-updated", handleRoomInfoUpdate);
    return () =>
      window.removeEventListener("room-info-updated", handleRoomInfoUpdate);
  }, [room.roomId]);

  const recipient = members?.find(
    (member) => member.user.userId !== currentUserId,
  );
  const { toggleSidebar } = useSidebar();
  const displayName =
    room.roomType === "dm" ? recipient?.user.nickname : localRoom.name;
  const displayAvatar =
    room.roomType === "dm"
      ? recipient?.user.nickname?.charAt(0)
      : localRoom.name?.charAt(0);
  const displayAvatarUrl =
    room.roomType === "dm" ? recipient?.user.avatar : localRoom.avatar;

  return (
    <>
      <div className="bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RiMenuLine className="h-5 w-5" />
            </Button>
            <Avatar className=" ">
              {" "}
              {room.roomType === "dm" ? (
                onlineUsers.has(recipient?.user.userId || "") && (
                  <AvatarBadge className="bg-green-500 h-2.5 w-2.5 ring-2 ring-card" />
                )
              ) : (
                <AvatarBadge className="bg-green-500 h-2.5 w-2.5 ring-2 ring-card" />
              )}
              {displayAvatarUrl && (
                <AvatarImage src={displayAvatarUrl} alt={displayName || ""} />
              )}
              <AvatarFallback className="bg-linear-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                {displayAvatar}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-foreground">
                {displayName}
              </h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {room.roomType === "dm" ? (
                  onlineUsers.has(recipient?.user.userId || "") ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      在線上
                    </>
                  ) : (
                    <>離線</>
                  )
                ) : (
                  <>
                    {
                      members.filter((m) => onlineUsers.has(m.user.userId))
                        .length
                    }
                    / {members.length} 位成員在線
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RiSearchLine className="h-5 w-5" />
            </Button>

            {/* AI Assistant */}
            <Button
              variant={isAIPanelOpen ? "default" : "ghost"}
              size="icon"
              onClick={onToggleAI}
              className="relative transition-all duration-300"
            >
              <RiSparklingLine className="h-5 w-5" />
              {isAIPanelOpen && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
              )}
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RiNotificationLine className="h-5 w-5" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Settings Panel Trigger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RiMoreLine className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Settings Panel */}
      <ChatRoomSettingsPanel
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        room={room}
        members={members}
        currentUserId={currentUserId}
      />
    </>
  );
}
