import { create } from "zustand";
import { PrivacySettings } from "@/shared/types";

interface PrivacyState {
  settings: PrivacySettings;
  isLoaded: boolean;
  setSettings: (settings: PrivacySettings) => void;
  updateSetting: <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K],
  ) => void;
}

const DEFAULT_SETTINGS: PrivacySettings = {
  showReadReceipts: true,
  showTypingIndicator: true,
  showOnlineStatus: true,
};

export const usePrivacyStore = create<PrivacyState>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,
  setSettings: (settings) =>
    set({ settings: { ...DEFAULT_SETTINGS, ...settings }, isLoaded: true }),
  updateSetting: (key, value) =>
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    })),
}));
