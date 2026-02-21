"use client";

import {
  getUserApiKeys,
  saveUserApiKeys,
} from "@/shared/service/api/user-api-key";
import { AIProvider, useAIStore } from "@/shared/store/ai-store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function useKey() {
  const { maskedKeys, setMaskedKey, setMaskedKeys } = useAIStore();
  const [isEditing, setIsEditing] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({
    openai: "",
    anthropic: "",
    google: "",
  });

  const saveUserApiKeysMutation = useMutation({
    mutationKey: ["saveUserApiKeys"],
    mutationFn: async (entries: Record<AIProvider, string>) => {
      const result = await saveUserApiKeys(entries);
      setMaskedKeys(result);
    },
  });

  useQuery({
    queryKey: ["userApiKeys"],
    queryFn: async () => {
      const keys = await getUserApiKeys();

      setMaskedKeys(keys);
      return keys;
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
  };
}
