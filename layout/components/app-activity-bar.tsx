"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  RiSearchLine,
  RiChat1Line,
  RiNotificationLine,
  RiHome4Line,
} from "@remixicon/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/shadcn/components/ui/tooltip";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { useSession } from "next-auth/react";
import {
  useAppSidebarStore,
  type ActivityPanel,
} from "@/shared/store/app-sidebar-store";
import { cn } from "@/shared/shadcn/lib/utils";
import SearchPanel from "./search-panel";
import NotificationPanel from "./notification-panel";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";

const ACTIVITY_BAR_WIDTH = "3.5rem";
const PANEL_WIDTH = "22rem";

/** Top-level navigation items shown in the Activity Bar */
const navItems: {
  id: "home" | "search" | "chat" | "notifications";
  icon: React.ElementType;
  label: string;
  href?: string;
  panel?: boolean;
}[] = [
  { id: "home", icon: RiHome4Line, label: "首頁", href: "/" },
  { id: "search", icon: RiSearchLine, label: "搜尋", panel: true },
  { id: "chat", icon: RiChat1Line, label: "聊天", href: "/c" },
  {
    id: "notifications",
    icon: RiNotificationLine,
    label: "通知",
    panel: true,
  },
];

export default function AppActivityBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { activePanel, togglePanel, closePanel } = useAppSidebarStore();

  // Don't show on auth pages
  const isAuthPage = pathname.startsWith("/auth");
  if (isAuthPage) return null;

  const isChatPage = pathname.startsWith("/c");
  const isHomePage = pathname === "/";

  return (
    <>
      {/* Activity Bar: always visible narrow icon strip */}
      <div
        className="fixed inset-y-0 left-0 z-40 flex flex-col items-center border-r border-border bg-sidebar py-3 gap-1"
        style={{ width: ACTIVITY_BAR_WIDTH }}
      >
        {/* Logo */}
        <div className="mb-2">
          <Link href="/">
            <Image
              src="/icons/logo-light.svg"
              alt="Logo"
              width={32}
              height={32}
              className="opacity-80 hover:opacity-100 transition-opacity"
            />
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.panel
              ? activePanel === item.id
              : item.id === "chat"
                ? isChatPage
                : item.id === "home"
                  ? isHomePage
                  : false;

            if (item.panel) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() =>
                        togglePanel(item.id as "search" | "notifications")
                      }
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href!}
                    onClick={() => closePanel()}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom: user avatar */}
        {session?.user && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={`/${session.user.username}`}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={session.user.avatar}
                    alt={session.user.nickname}
                  />
                  <AvatarFallback className="text-xs">
                    {session.user.nickname?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">個人檔案</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Slide-out Panel (search / notifications) */}
      <AnimatePresence>
        {activePanel && (
          <>
            {/* Backdrop: click to close */}
            <motion.div
              key="panel-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px]"
              style={{ left: ACTIVITY_BAR_WIDTH }}
              onClick={closePanel}
            />
            {/* Panel */}
            <motion.div
              key="panel-content"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 z-40 border-r border-border bg-background shadow-xl"
              style={{
                left: ACTIVITY_BAR_WIDTH,
                width: PANEL_WIDTH,
              }}
            >
              {activePanel === "search" && <SearchPanel />}
              {activePanel === "notifications" && <NotificationPanel />}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
