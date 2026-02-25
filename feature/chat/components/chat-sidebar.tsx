"use client";

import * as React from "react";

import { NavMain } from "@/feature/chat/components/nav-main";
import { SidebarProvider } from "@/shared/shadcn/components/ui/sidebar";
import { ScrollArea } from "@/shared/shadcn/components/ui/scroll-area";

export function ChatSidebar() {
  return (
    <SidebarProvider
      open={true}
      onOpenChange={() => {}}
      style={
        {
          "--sidebar-width": "100%",
          "--sidebar-width-mobile": "100%",
        } as React.CSSProperties
      }
    >
      <ScrollArea className="h-full w-full">
        <div className="flex flex-col h-full p-2">
          <NavMain />
        </div>
      </ScrollArea>
    </SidebarProvider>
  );
}
