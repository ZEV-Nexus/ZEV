"use client";

import * as React from "react";

import { NavMain } from "@/feature/chat/components/nav-main";

import { NavHeader } from "@/feature/chat/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
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
