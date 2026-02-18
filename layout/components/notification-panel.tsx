"use client";

import React from "react";
import { RiNotificationLine, RiCheckDoubleLine } from "@remixicon/react";
import { ScrollArea } from "@/shared/shadcn/components/ui/scroll-area";
import { Button } from "@/shared/shadcn/components/ui/button";

export default function NotificationPanel() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">通知</h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <RiCheckDoubleLine className="h-3.5 w-3.5" />
          全部已讀
        </Button>
      </div>

      {/* Notification list */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <RiNotificationLine className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">暫無通知</p>
            <p className="text-xs mt-1 opacity-60">
              新的訊息和更新會顯示在這裡
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
