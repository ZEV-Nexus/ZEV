"use client";

import React from "react";
import {
  RiNotificationLine,
  RiCheckDoubleLine,
  RiHeartFill,
  RiChat1Fill,
  RiUserAddFill,
  RiLoader4Line,
} from "@remixicon/react";
import { ScrollArea } from "@/shared/shadcn/components/ui/scroll-area";
import { Button } from "@/shared/shadcn/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { useNotificationStore } from "@/shared/store/notification-store";
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
} from "@/shared/service/api/notification";
import { formatDistanceToNow } from "date-fns";
import { zhTW, enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/shadcn/lib/utils";
import { Notification } from "@/shared/types";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useLocaleStore } from "@/shared/store/locale-store";

export default function NotificationPanel() {
  const router = useRouter();
  const t = useTranslations("common");
  const { locale } = useLocaleStore();
  const {
    notifications,
    unreadCount,
    setNotifications,
    markAsRead: markStoreAsRead,
    markAllAsRead: markStoreAllAsRead,
    isLoaded,
  } = useNotificationStore();

  const { isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await getNotifications();
      if (res.ok) {
        setNotifications(
          res.data.notifications,
          res.data.unreadCount,
          res.data.hasMore,
        );
      }
      return res;
    },
    enabled: !isLoaded,
  });

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    markStoreAllAsRead(); // Optimistic update
    await markAllAsRead();
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      markStoreAsRead([notification.id]);
      markAsRead([notification.id]); // Fire and forget
    }

    // Navigation logic
    if (notification.type === "room_invite" && notification.room?.id) {
      router.push(`/c/${notification.room?.id}`);
    } else if (notification.post?.id) {
      // Navigate to post... assuming /post/[id] or just open modal?
      // For now, maybe just do nothing or toast "Navigating..." if path unknown
      // Assuming specific post page exists or implemented later.
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "post_like":
        return <RiHeartFill className="h-3 w-3 text-white" />;
      case "post_comment":
        return <RiChat1Fill className="h-3 w-3 text-white" />;
      case "room_invite":
        return <RiUserAddFill className="h-3 w-3 text-white" />;
      default:
        return <RiNotificationLine className="h-3 w-3 text-white" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case "post_like":
        return "bg-pink-500";
      case "post_comment":
        return "bg-blue-500";
      case "room_invite":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getText = (notification: Notification) => {
    switch (notification.type) {
      case "post_like":
        return t("likedYourPost");
      case "post_comment":
        return t("commentedYourPost");
      case "room_invite":
        return t("invitedToRoom", { name: notification.room?.name || "Chat" });
      default:
        return t("newNotification");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">
            {t("notificationTitle")}
          </h2>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
        >
          <RiCheckDoubleLine className="h-3.5 w-3.5" />
          {t("markAllRead")}
        </Button>
      </div>

      {/* Notification list */}
      <ScrollArea className="flex-1">
        {isLoading && !isLoaded ? (
          <div className="flex justify-center p-8">
            <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-3">
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RiNotificationLine className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">{t("noNotifications")}</p>
              <p className="text-xs mt-1 opacity-60">{t("newUpdatesHere")}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 border-b border-border/50 last:border-0",
                  !notification.read && "bg-primary/5 hover:bg-primary/10",
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage
                      src={notification.sender.avatar}
                      alt={notification.sender.nickname}
                    />
                    <AvatarFallback>
                      {notification.sender.nickname?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-background",
                      getIconBg(notification.type),
                    )}
                  >
                    {getIcon(notification.type)}
                  </div>
                </div>

                <div className="flex-1 space-y-1 overflow-hidden">
                  <p className="text-sm font-medium leading-none">
                    <span className="font-bold">
                      {notification.sender.nickname}
                    </span>{" "}
                    <span className="font-normal text-muted-foreground">
                      {getText(notification)}
                    </span>
                  </p>

                  {/* Content Preview */}
                  {(notification.post?.content ||
                    notification.comment?.content) && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      {notification.comment?.content ||
                        notification.post?.content}
                    </p>
                  )}

                  <p className="text-[10px] text-muted-foreground/60">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                      locale: locale === "zh-TW" ? zhTW : enUS,
                    })}
                  </p>
                </div>

                {!notification.read && (
                  <div className="shrink-0 self-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
              </button>
            ))}

            {/* Load more sentinel can be added here */}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
