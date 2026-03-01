"use client";

import { ChatSidebar } from "@/feature/chat/components/chat-sidebar";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/shared/shadcn/hooks/use-mobile";
import React from "react";
import { useKey } from "@/feature/settings/hooks/use-key";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isRoomPage = pathname !== "/c" && pathname.startsWith("/c/");
  useKey();

  // useAblyChat({
  //   roomId: currentRoom?.id || "",
  //   userId: session?.user?.id || "",
  //   nickname: session?.user?.nickname || "",
  //   onMessage: (message) => {
  //     updateRoomLastMessage(currentRoom?.id || "", message);
  //     console.log("Received message in ChatLayout:", message);
  //     if (
  //       message.member.user.id !== session?.user?.id &&
  //       currentRoom?.id !== message.room.id
  //     ) {
  //       incrementUnreadCount(message.room.id);
  //     }
  //   },
  // });
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Desktop: always show; Mobile: only show on /c (chat list) */}
      {(!isMobile || !isRoomPage) && (
        <div
          className={
            isMobile
              ? "w-full h-full"
              : "w-88 shrink-0 border-r border-border h-full"
          }
        >
          <ChatSidebar />
        </div>
      )}

      {/* Desktop: always show; Mobile: only show on /c/[roomId] */}
      {(!isMobile || isRoomPage) && (
        <div className="flex-1 min-w-0 h-full">{children}</div>
      )}
    </div>
  );
}
