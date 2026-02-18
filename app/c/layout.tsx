import { ChatSidebar } from "@/feature/chat/components/chat-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/shared/shadcn/components/ui/sidebar";
import AblyNotificationProvider from "@/shared/components/provider/ably-notification-provider";
import React from "react";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AblyNotificationProvider>
      <ChatSidebar />
      <SidebarInset className="px-2">{children}</SidebarInset>
    </AblyNotificationProvider>
  );
}
