"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/shadcn/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/shadcn/components/ui/sidebar";
import { RiArrowUpDownLine, RiLogoutBoxLine } from "@remixicon/react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/shared/shadcn/components/ui/button";

export function NavUser() {
  const { isMobile } = useSidebar();
  const { data: session } = useSession();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={session?.user.avatar}
                  alt={session?.user.nickname}
                />
                <AvatarFallback className="rounded-lg">
                  {session?.user.nickname.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {session?.user.nickname}
                </span>
                <span className="truncate text-xs">{session?.user.email}</span>
              </div>
              <RiArrowUpDownLine className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <Button variant={"ghost"} asChild>
                <Link
                  className="flex w-full items-center h-fit gap-2 px-3 py-2 text-left text-sm"
                  href={`/${session?.user.username}`}
                >
                  <Avatar className="h-8 w-8 ">
                    <AvatarImage
                      src={session?.user.avatar}
                      alt={session?.user.nickname}
                    />
                    <AvatarFallback>
                      {session?.user.nickname.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {session?.user.nickname}
                    </span>
                    <span className="truncate text-xs">
                      {session?.user.email}
                    </span>
                  </div>{" "}
                </Link>
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => signOut()}>
              <RiLogoutBoxLine />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
