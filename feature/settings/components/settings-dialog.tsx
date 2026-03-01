"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/shared/shadcn/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/shadcn/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/shadcn/components/ui/tooltip";
import {
  RiSettings4Line,
  RiKey2Line,
  RiSettings3Line,
  RiNotification3Line,
  RiLinksLine,
  RiChatPrivateLine,
} from "@remixicon/react";

import { GeneralSettings } from "./general-settings";
import { ApiKeySettings } from "./api-key-settings";
import { NotificationSettings } from "./notification-settings";
import ConnectSetting from "./connect-setting";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { PrivacySettings } from "./privacy-setting";

const tabs = [
  { value: "general", labelKey: "general", icon: RiSettings3Line },
  { value: "api-keys", labelKey: "apiKeys", icon: RiKey2Line },
  { value: "connections", labelKey: "connections", icon: RiLinksLine },
  {
    value: "notifications",
    labelKey: "notifications",
    icon: RiNotification3Line,
  },
  {
    value: "privacy",
    labelKey: "privacy",
    icon: RiChatPrivateLine,
  },
] as const;

export function SettingsDialog() {
  const [open, setOpen] = useState(false);

  const { data: session } = useSession();
  const t = useTranslations("settings");
  const needSession = tabs.filter((tab) => tab.value !== "general");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200">
              <RiSettings4Line className="h-5 w-5" />
            </button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">{t("title")}</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-[700px] p-0 gap-0">
        <Tabs
          defaultValue="general"
          orientation="vertical"
          className="flex h-[500px] min-h-full"
        >
          <TabsList className="flex flex-col min-h-full w-[180px]  items-center shrink-0 rounded-none rounded-l-lg border-r bg-muted/50 p-2 justify-start gap-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                disabled={
                  needSession.some((t) => t.value === tab.value) && !session
                }
                className="w-full flex-0 justify-start  gap-2 px-3 py-2 text-sm"
              >
                <tab.icon className="h-4 w-4" />
                {t(tab.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            <DialogTitle className="mb-4"></DialogTitle>
            <TabsContent value="general">
              <GeneralSettings />
            </TabsContent>
            {session?.user && (
              <>
                <TabsContent value="api-keys">
                  <ApiKeySettings />
                </TabsContent>
                <TabsContent value="connections">
                  <ConnectSetting />
                </TabsContent>
                <TabsContent value="privacy">
                  <PrivacySettings />
                </TabsContent>

                <TabsContent value="notifications">
                  <NotificationSettings />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
