"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { Card, CardContent } from "@/shared/shadcn/components/ui/card";
import { Label } from "@/shared/shadcn/components/ui/label";
import { Button } from "@/shared/shadcn/components/ui/button";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { RiSunLine, RiMoonLine, RiComputerLine } from "@remixicon/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/shadcn/components/ui/select";
import { useTranslations } from "next-intl";
import { useLocaleStore, Locale } from "@/shared/store/locale-store";
import LogoImage from "@/shared/components/logo-image";
import Link from "next/link";
import { signOut } from "next-auth/react";

const themeOptions = [
  { value: "light", labelKey: "settings.themeLight", icon: RiSunLine },
  { value: "dark", labelKey: "settings.themeDark", icon: RiMoonLine },
  { value: "system", labelKey: "settings.themeSystem", icon: RiComputerLine },
] as const;

const localeOptions = [
  { value: "zh-TW", label: "繁體中文" },
  { value: "en", label: "English" },
] as const;

export function GeneralSettings() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const t = useTranslations();
  const { locale, setLocale } = useLocaleStore();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("settings.general")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.generalDescription")}
        </p>
      </div>

      <div className="grid gap-4">
        {session?.user ? (
          <Card className="flex-row items-center justify-between">
            <CardContent className=" w-full flex  items-center   justify-between">
              <div className="flex flex-row items-center">
                <Avatar>
                  <AvatarImage src={session?.user?.avatar || undefined} />
                  <AvatarFallback>
                    {session?.user?.nickname?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-4">
                  <p className="text-sm font-medium">
                    {session?.user?.nickname}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {session?.user?.email}
                  </p>
                </div>
              </div>

              <Button variant="destructive" onClick={() => signOut()}>
                {t("settings.logout")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-row items-center justify-between">
            <CardContent className=" w-full flex  items-center   justify-between">
              <div className="flex flex-row items-center">
                <LogoImage />
                <div className="ml-4">
                  <p className="text-sm font-medium">{t("auth.login")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.loginDescription")}
                  </p>
                </div>
              </div>
              <Link href="/auth/login">
                <Button>{t("auth.login")}</Button>
              </Link>
            </CardContent>
          </Card>
        )}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("settings.language")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings.languageDescription")}
            </p>
          </div>
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {localeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("settings.theme")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings.themeDescription")}
            </p>
          </div>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder={t("settings.selectTheme")} />
            </SelectTrigger>
            <SelectContent>
              {themeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    {t(option.labelKey)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
