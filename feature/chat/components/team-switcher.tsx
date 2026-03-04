"use client";

import { Input } from "@/shared/shadcn/components/ui/input";
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/shared/shadcn/components/ui/sidebar";
import { RiSearch2Line } from "@remixicon/react";

export function NavHeader() {
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
