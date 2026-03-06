"use client";

import { ChatSidebar } from "@/feature/chat/components/chat-sidebar";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/shared/shadcn/hooks/use-mobile";
import React from "react";
import { useKey } from "@/feature/settings/hooks/use-key";
import { useQuery } from "@tanstack/react-query";
import { getUserApiKeys } from "@/shared/service/api/user-api-key";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isRoomPage = pathname !== "/c" && pathname.startsWith("/c/");
  const { setMaskedKeys } = useKey();
  useQuery({
    queryKey: ["userApiKeys"],
    queryFn: async () => {
      const keys = await getUserApiKeys();
      setMaskedKeys(keys);
      return keys;
    },
  });
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

      {(!isMobile || isRoomPage) && (
        <div className="flex-1 min-w-0 h-full">{children}</div>
      )}
    </div>
  );
}
