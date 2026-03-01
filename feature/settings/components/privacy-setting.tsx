"use client";

import { usePrivacy } from "@/feature/chat/hooks/use-privacy";

import { ScrollArea } from "@/shared/shadcn/components/ui/scroll-area";
import { Separator } from "@/shared/shadcn/components/ui/separator";
import { Switch } from "@/shared/shadcn/components/ui/switch";
import { RiEyeOffLine, RiLock2Line } from "@remixicon/react";
import { useTranslations } from "next-intl";

export function PrivacySettings() {
  const t = useTranslations();
  const { settings, updating, handleToggle } = usePrivacy();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("settings.privacy")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.privacyDescription")}
        </p>
      </div>

      <div className="grid gap-4">
        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
              {t("chatSettings.messagePrivacy")}
            </h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-2.5 px-2 rounded-lg ">
                <div className="flex items-center gap-3">
                  <RiEyeOffLine className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm">
                      {t("chatSettings.readReceipts")}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {t("chatSettings.readReceiptsDescription")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.showReadReceipts}
                  disabled={updating === "showReadReceipts"}
                  onCheckedChange={(v) => handleToggle("showReadReceipts", v)}
                />
              </div>
              <div className="flex items-center justify-between py-2.5 px-2 rounded-lg ">
                <div className="flex items-center gap-3">
                  <RiLock2Line className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm">
                      {t("chatSettings.typingIndicator")}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {t("chatSettings.typingIndicatorDescription")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.showTypingIndicator}
                  disabled={updating === "showTypingIndicator"}
                  onCheckedChange={(v) =>
                    handleToggle("showTypingIndicator", v)
                  }
                />
              </div>
            </div>
          </div>

          <Separator className="my-1" />

          {/* Visibility */}

          <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            {t("chatSettings.visibility")}
          </h4>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2.5 px-2 rounded-lg ">
              <div className="flex items-center gap-3">
                <RiEyeOffLine className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm">
                    {t("chatSettings.showOnlineStatus")}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {t("chatSettings.showOnlineStatusDescription")}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.showOnlineStatus}
                disabled={updating === "showOnlineStatus"}
                onCheckedChange={(v) => handleToggle("showOnlineStatus", v)}
              />
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
