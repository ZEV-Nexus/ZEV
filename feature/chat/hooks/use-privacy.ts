import {
  getPrivacySettings,
  updatePrivacySettings,
} from "@/shared/service/api/user";
import { usePrivacyStore } from "@/shared/store/privacy-store";
import { PrivacySettings } from "@/shared/types";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
const DEFAULT_SETTINGS: PrivacySettings = {
  showReadReceipts: true,
  showTypingIndicator: true,
  showOnlineStatus: true,
};
export const usePrivacy = () => {
  const {
    settings,
    isLoaded,
    setSettings: setStoreSettings,
  } = usePrivacyStore();
  const [localSettings, setLocalSettings] = useState<PrivacySettings>(settings);

  const [updating, setUpdating] = useState<string | null>(null);
  const t = useTranslations("chatSettings");
  const { isLoading } = useQuery({
    queryKey: ["privacySettings"],
    queryFn: async () => {
      const data = await getPrivacySettings();
      setStoreSettings({ ...DEFAULT_SETTINGS, ...data });
      setLocalSettings({ ...DEFAULT_SETTINGS, ...data });
      return data;
    },

    enabled: !isLoaded,
  });

  const handleToggle = useCallback(
    async (key: keyof PrivacySettings, value: boolean) => {
      const previousSettings = { ...localSettings };

      setLocalSettings((prev) => ({ ...prev, [key]: value }));
      usePrivacyStore.getState().updateSetting(key, value);
      setUpdating(key);

      try {
        const updated = await updatePrivacySettings({ [key]: value });
        if (updated) {
          const merged = { ...DEFAULT_SETTINGS, ...updated };
          setLocalSettings(merged);
          setStoreSettings(merged);
        }
      } catch (error) {
        // Revert on failure
        setLocalSettings(previousSettings);
        setStoreSettings(previousSettings);
        toast.error(t("privacyUpdateError"));
        console.error("Failed to update privacy settings:", error);
      } finally {
        setUpdating(null);
      }
    },
    [localSettings, t, setStoreSettings],
  );
  return { settings: localSettings, isLoading, handleToggle, updating };
};
