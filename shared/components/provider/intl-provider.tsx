"use client";

import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { useLocaleStore } from "@/shared/store/locale-store";
import { useEffect, useState } from "react";

const messageImports: Record<string, () => Promise<AbstractIntlMessages>> = {
  en: () => import("@/messages/en.json").then((m) => m.default),
  "zh-TW": () => import("@/messages/zh-TW.json").then((m) => m.default),
};

export default function IntlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocaleStore((s) => s.locale);
  const [messages, setMessages] = useState<AbstractIntlMessages | null>(null);

  // Wait for zustand store hydration
  useEffect(() => {
    useLocaleStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const load = messageImports[locale] ?? messageImports["zh-TW"];
    load().then(setMessages);
  }, [locale]);

  if (!messages) return null;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
