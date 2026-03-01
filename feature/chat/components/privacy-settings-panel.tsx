"use client";

import { Button } from "@/shared/shadcn/components/ui/button";
import { Switch } from "@/shared/shadcn/components/ui/switch";
import { ScrollArea } from "@/shared/shadcn/components/ui/scroll-area";
import { Separator } from "@/shared/shadcn/components/ui/separator";
import {
  RiArrowLeftLine,
  RiShieldLine,
  RiEyeOffLine,
  RiLock2Line,
  RiSpamLine,
  RiLoader2Line,
} from "@remixicon/react";
import { useTranslations } from "next-intl";

import { PrivacySettings } from "@/shared/types";

import { usePrivacy } from "../hooks/use-privacy";

interface PrivacySettingsPanelProps {
  onBack: () => void;
  roomType: "dm" | "group" | "channel" | "ai";
}

const DEFAULT_SETTINGS: PrivacySettings = {
  showReadReceipts: true,
  showTypingIndicator: true,
  showOnlineStatus: true,
};

export function PrivacySettingsPanel({
  onBack,
  roomType,
}: PrivacySettingsPanelProps) {
  const t = useTranslations("chatSettings");
  const { settings, isLoading, handleToggle, updating } = usePrivacy();

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onBack}
          >
            <RiArrowLeftLine className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <RiShieldLine className="h-4 w-4" />
            <h3 className="text-sm font-semibold">{t("privacySettings")}</h3>
          </div>
        </div>
        <div className="flex items-center justify-center flex-1">
          <RiLoader2Line className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onBack}
        >
          <RiArrowLeftLine className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <RiShieldLine className="h-4 w-4" />
          <h3 className="text-sm font-semibold">{t("privacySettings")}</h3>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {/* Message Privacy */}
          <div className="px-4 py-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
              {t("messagePrivacy")}
            </h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <RiEyeOffLine className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm">{t("readReceipts")}</span>
                    <p className="text-xs text-muted-foreground">
                      {t("readReceiptsDescription")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.showReadReceipts}
                  disabled={updating === "showReadReceipts"}
                  onCheckedChange={(v) => handleToggle("showReadReceipts", v)}
                />
              </div>
              <div className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <RiLock2Line className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm">{t("typingIndicator")}</span>
                    <p className="text-xs text-muted-foreground">
                      {t("typingIndicatorDescription")}
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

          <Separator />

          {/* Visibility */}
          <div className="px-4 py-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
              {t("visibility")}
            </h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <RiEyeOffLine className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm">{t("showOnlineStatus")}</span>
                    <p className="text-xs text-muted-foreground">
                      {t("showOnlineStatusDescription")}
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
          </div>

          <Separator />

          {/* Blocking */}
          {roomType === "dm" && (
            <div className="px-4 py-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                {t("blocking")}
              </h4>
              <div className="space-y-1">
                <button className="flex items-center gap-3 w-full py-2.5 px-2 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer">
                  <RiSpamLine className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">
                    {t("blockUser")}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
