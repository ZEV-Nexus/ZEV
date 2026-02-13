"use client";

import * as React from "react";

import { NavMain } from "@/feature/chat/components/nav-main";
import { NavUser } from "@/feature/chat/components/nav-user";
import { TeamSwitcher } from "@/feature/chat/components/team-switcher";
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
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <NavMain />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
