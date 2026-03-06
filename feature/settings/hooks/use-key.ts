"use client";

import {
  deleteUserApiKey,
  saveUserApiKeys,
} from "@/shared/service/api/user-api-key";
import { AIProvider, useAIStore, UserApiKey } from "@/shared/store/ai-store";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export function useKey() {
  const { maskedKeys, setMaskedKey, setMaskedKeys, deleteApiKey } =
    useAIStore();
  const [isEditing, setIsEditing] = useState(false);
  const [apiKeys, setApiKeys] = useState<UserApiKey>(
    Object.fromEntries(
      Object.entries(maskedKeys).map(([k, v]) => [{ id: v.id, key: "" }]),
    ),
  );

  const saveUserApiKeysMutation = useMutation({
    mutationKey: ["saveUserApiKeys"],
    mutationFn: async (entries: UserApiKey) => {
      const result = await saveUserApiKeys(entries);
      setMaskedKeys(result);
    },
    onSuccess() {
      toast.success("API Keys 已保存");
      setIsEditing(false);
    },
    onError(error: unknown) {
      toast.error((error as Error)?.message || "保存失敗");
    },
  });

  const [showKeys, setShowKeys] = useState<Record<AIProvider, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
  });
  const toggleShowKey = (provider: AIProvider) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleDeleteKey = async (provider: AIProvider) => {
    deleteApiKey(provider);
    await deleteUserApiKey(provider);
  };

  return {
    maskedKeys,
    setMaskedKey,
    setMaskedKeys,
    apiKeys,
    setApiKeys,
    showKeys,
    toggleShowKey,
    saveUserApiKeysMutation,
    isEditing,
    setIsEditing,
    handleDeleteKey,
  };
}
