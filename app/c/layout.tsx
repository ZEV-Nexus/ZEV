import { ChatSidebar } from "@/feature/chat/components/chat-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/shared/shadcn/components/ui/sidebar";
import React from "react";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "22rem",
          "--sidebar-width-mobile": "20rem",
        } as React.CSSProperties
      }
    >
      <ChatSidebar />
      <SidebarInset className="px-2">{children}</SidebarInset>
    </SidebarProvider>
  );
}
