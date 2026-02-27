"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  RiSearchLine,
  RiSearchFill,
  RiChat1Line,
  RiChat1Fill,
  RiNotificationLine,
  RiNotificationFill,
  RiHome4Line,
  RiHome4Fill,
} from "@remixicon/react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/shadcn/components/ui/sidebar";
import { useSession } from "next-auth/react";
import { useAppSidebarStore } from "@/shared/store/app-sidebar-store";
import SearchPanel from "./search-panel";
import NotificationPanel from "./notification-panel";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useNotificationStore } from "@/shared/store/notification-store";
import { SettingsDialog } from "@/feature/settings/components/settings-dialog";
import { useIsMobile } from "@/shared/shadcn/hooks/use-mobile";
import { cn } from "@/shared/shadcn/lib/utils";
import { Dialog, DialogContent } from "@/shared/shadcn/components/ui/dialog";

const PANEL_WIDTH = "22rem";

/** Top-level navigation items shown in the Activity Bar */
const navItems: {
  id: "home" | "search" | "chat" | "notifications";
  icon: React.ElementType;
  activeIcon: React.ElementType;
  label: string;
  href?: string;
  panel?: boolean;
}[] = [
  {
    id: "home",
    icon: RiHome4Line,
    activeIcon: RiHome4Fill,
    label: "首頁",
    href: "/",
  },
  {
    id: "search",
    icon: RiSearchLine,
    activeIcon: RiSearchFill,
    label: "搜尋",
    panel: true,
  },
  {
    id: "chat",
    icon: RiChat1Line,
    activeIcon: RiChat1Fill,
    label: "聊天",
    href: "/c",
    panel: true,
  },
  {
    id: "notifications",
    icon: RiNotificationLine,
    activeIcon: RiNotificationFill,
    label: "通知",
    panel: true,
  },
];

export default function AppActivityBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { activePanel, togglePanel, closePanel } = useAppSidebarStore();
  const { unreadCount } = useNotificationStore();
  const isMobile = useIsMobile();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isChatPage = pathname.startsWith("/c");
  const isChatRoomPage = pathname !== "/c" && pathname.startsWith("/c/");
  const isHomePage = pathname === "/";

  // Mobile: hide bottom bar when inside a chat room (full screen chat)
  if (isMobile && isChatRoomPage) {
    return null;
  }

  // ─── Mobile Bottom Bar ───
  if (isMobile) {
    return (
      <>
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <DialogContent className="p-0 sm:max-w-lg w-[min(92vw,32rem)] h-[min(80vh,40rem)]">
            <SearchPanel onClose={() => setIsSearchOpen(false)} />
          </DialogContent>
        </Dialog>

        {/* Slide-up panel for notifications */}
        <AnimatePresence>
          {activePanel && (
            <>
              <motion.div
                key="panel-content-mobile"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed inset-x-0 bottom-14 top-0 z-40 border-t border-border bg-background shadow-xl overflow-auto"
              >
                {activePanel === "notifications" && <NotificationPanel />}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Bottom navigation bar */}
        <nav className="shrink-0 border-t border-border bg-background safe-area-bottom">
          <div className="flex items-center justify-around h-14">
            {navItems.map((item) => {
              const isActive =
                item.id === "search"
                  ? isSearchOpen
                  : item.id === "chat"
                    ? isChatPage
                    : item.panel
                      ? activePanel === item.id
                      : item.id === "home"
                        ? isHomePage
                        : false;
              const Icon = isActive ? item.activeIcon : item.icon;

              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  onClick={() => {
                    if (item.id === "search") {
                      closePanel();
                      setIsSearchOpen((prev) => !prev);
                    } else if (item.id === "chat") {
                      closePanel();
                      setIsSearchOpen(false);
                      router.push("/c");
                    } else if (item.panel) {
                      setIsSearchOpen(false);
                      togglePanel(item.id as "search" | "notifications");
                    } else if (item.href) {
                      closePanel();
                      setIsSearchOpen(false);
                      router.push(item.href);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors",
                    isActive
                      ? "text-foreground/50 hover:text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" />
                    {item.id === "notifications" && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] leading-none">{item.label}</span>
                </motion.button>
              );
            })}

            {/* User avatar */}
            {session?.user && (
              <Link
                href={`/${session.user.username}`}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors",
                  pathname === `/${session.user.username}`
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  closePanel();
                  setIsSearchOpen(false);
                }}
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    src={session.user.avatar}
                    alt={session.user.nickname}
                  />
                  <AvatarFallback className="text-[8px]">
                    {session.user.nickname?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] leading-none">個人</span>
              </Link>
            )}
          </div>
        </nav>
      </>
    );
  }

  // ─── Desktop Sidebar ───
  return (
    <>
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="p-0 sm:max-w-lg w-[min(92vw,32rem)] h-[min(80vh,40rem)]">
          <SearchPanel onClose={() => setIsSearchOpen(false)} />
        </DialogContent>
      </Dialog>

      <Sidebar collapsible="icon">
        {/* Logo */}
        <SidebarHeader className="items-center py-3">
          <Link
            href="/"
            onClick={() => {
              closePanel();
              setIsSearchOpen(false);
            }}
          >
            <Image
              src="/icons/logo-light.svg"
              alt="Logo"
              width={28}
              height={28}
              className="opacity-80 hover:opacity-100 transition-opacity"
            />
          </Link>
        </SidebarHeader>

        {/* Nav items */}
        <SidebarContent className="overflow-visible!">
          <SidebarGroup>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.id === "search"
                    ? isSearchOpen
                    : item.id === "chat"
                      ? isChatPage
                      : item.panel
                        ? activePanel === item.id
                        : item.id === "home"
                          ? isHomePage
                          : false;
                const Icon = isActive ? item.activeIcon : item.icon;

                if (item.panel) {
                  return (
                    <SidebarMenuItem key={item.id}>
                      <motion.div
                        whileTap={{ scale: 0.8 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        }}
                      >
                        <SidebarMenuButton
                          tooltip={item.label}
                          isActive={isActive}
                          className="relative text-foreground/50 [&_svg]:size-5 group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
                          onClick={() => {
                            if (item.id === "search") {
                              closePanel();
                              setIsSearchOpen((prev) => !prev);
                            } else if (item.id === "chat") {
                              closePanel();
                              setIsSearchOpen(false);
                              router.push("/c");
                            } else {
                              setIsSearchOpen(false);
                              togglePanel(
                                item.id as "search" | "notifications",
                              );
                            }
                          }}
                        >
                          <Icon />
                          {item.id === "notifications" && unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-sidebar animate-in zoom-in">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </motion.div>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.id}>
                    <motion.div
                      whileTap={{ scale: 0.8 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 17,
                      }}
                    >
                      <SidebarMenuButton
                        tooltip={item.label}
                        isActive={isActive}
                        className="[&_svg]:size-5 group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
                        asChild
                      >
                        <Link
                          href={item.href!}
                          onClick={() => {
                            closePanel();
                            setIsSearchOpen(false);
                          }}
                        >
                          <Icon />
                        </Link>
                      </SidebarMenuButton>
                    </motion.div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer: settings + user avatar */}
        <SidebarFooter className="items-center">
          <SettingsDialog />
          {session?.user && (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="個人檔案" asChild>
                  <Link
                    href={`/${session.user.username}`}
                    onClick={() => {
                      closePanel();
                      setIsSearchOpen(false);
                    }}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={session.user.avatar}
                        alt={session.user.nickname}
                      />
                      <AvatarFallback className="text-xs">
                        {session.user.nickname?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </SidebarFooter>
      </Sidebar>

      {/* Slide-out Panel (notifications) */}
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
              style={{ left: "var(--sidebar-width-icon)" }}
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
                left: "var(--sidebar-width-icon)",
                width: PANEL_WIDTH,
              }}
            >
              {activePanel === "notifications" && <NotificationPanel />}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
