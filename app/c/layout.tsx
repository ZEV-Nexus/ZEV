"use client";

import { ChatSidebar } from "@/feature/chat/components/chat-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/shared/shadcn/components/ui/sidebar";

import React from "react";
import { useAppSidebarStore } from "@/shared/store/app-sidebar-store";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { chatSidebarOpen, setChatSidebarOpen } = useAppSidebarStore();

  return (
    <SidebarProvider
      open={chatSidebarOpen}
      onOpenChange={setChatSidebarOpen}
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
