"use client";

import * as React from "react";

import { NavMain } from "@/feature/chat/components/nav-main";

import {
  Sidebar,
  SidebarContent,
  SidebarRail,
} from "@/shared/shadcn/components/ui/sidebar";

// This is sample data.

export function ChatSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent>
        <NavMain />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
