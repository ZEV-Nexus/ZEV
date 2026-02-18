"use client";

import { Button } from "@/shared/shadcn/components/ui/button";
import { Input } from "@/shared/shadcn/components/ui/input";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/shadcn/components/ui/sidebar";
import {
  RiArrowUpDownLine,
  RiMenu2Line,
  RiMenuLine,
  RiSearch2Line,
  RiSideBarLine,
} from "@remixicon/react";

export function NavHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem className=" flex justify-between items-center">
        <div className="relative  w-full">
          <RiSearch2Line className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="bg-background pl-9"
            id="search-input"
            placeholder="Search..."
            type="search"
          />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
