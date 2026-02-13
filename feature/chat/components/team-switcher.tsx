"use client";

import { Button } from "@/shared/shadcn/components/ui/button";
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
  RiSideBarLine,
} from "@remixicon/react";
import Image from "next/image";

export function TeamSwitcher() {
  const { toggleSidebar } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem className=" flex justify-between items-center">
        <Image
          src="/icons/logo-with-text-light-removebg.png"
          alt="logo"
          className=" rounded-md aspect-video object-cover"
          width={100}
          height={30}
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RiMenuLine className="h-5 w-5" />
        </Button>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
