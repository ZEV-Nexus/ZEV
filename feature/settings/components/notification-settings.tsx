"use client";

import { Label } from "@/shared/shadcn/components/ui/label";
import { Switch } from "@/shared/shadcn/components/ui/switch";
import { useTranslations } from "next-intl";

export function NotificationSettings() {
  const t = useTranslations("settings");
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("notifications")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("notificationsDescription")}
        </p>
      </div>

      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="desktop-notifications">
              {t("desktopNotifications")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("desktopNotificationsDescription")}
            </p>
          </div>
          <Switch id="desktop-notifications" />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sound-notifications">
              {t("soundNotifications")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("soundNotificationsDescription")}
            </p>
          </div>
          <Switch id="sound-notifications" />
        </div>
      </div>
    </div>
  );
}
