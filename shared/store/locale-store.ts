"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "en" | "zh-TW";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "zh-TW",
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "zev-locale",
    },
  ),
);
