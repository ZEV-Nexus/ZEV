"use client";

import { Label } from "@/shared/shadcn/components/ui/label";
import { Switch } from "@/shared/shadcn/components/ui/switch";

export function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">通知</h3>
        <p className="text-sm text-muted-foreground">管理您的通知偏好設定。</p>
      </div>

      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="desktop-notifications">桌面通知</Label>
            <p className="text-sm text-muted-foreground">接收桌面推播通知</p>
          </div>
          <Switch id="desktop-notifications" />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sound-notifications">音效提醒</Label>
            <p className="text-sm text-muted-foreground">
              收到訊息時播放提示音
            </p>
          </div>
          <Switch id="sound-notifications" />
        </div>
      </div>
    </div>
  );
}
