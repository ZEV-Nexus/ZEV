import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AIProvider = "openai" | "google" | "anthropic";

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
}

export type UserApiKey = Record<AIProvider, { key: string; id: string }>;

export const AI_MODELS: AIModel[] = [
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai" },
  {
    id: "claude-3-5-sonnet-20240620",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "anthropic",
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    provider: "anthropic",
  },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google" },
];

interface AIState {
  apiKeys: UserApiKey;
  /** Masked representations of DB-stored keys (e.g. "••••••••"), empty string means not set */
  maskedKeys: UserApiKey;
  selectedModelId: string;
}

interface AIAction {
  setApiKey: (provider: AIProvider, key: string, id: string) => void;
  setMaskedKey: (provider: AIProvider, masked: string) => void;
  setMaskedKeys: (masked: UserApiKey) => void;
  setSelectedModelId: (modelId: string) => void;
  getApiKey: (provider: AIProvider) => UserApiKey[AIProvider];
}

export const useAIStore = create<AIState & AIAction>()(
  persist(
    (set, get) => ({
      apiKeys: {
        openai: { key: "", id: "" },
        google: { key: "", id: "" },
        anthropic: { key: "", id: "" },
      },
      maskedKeys: {
        openai: { key: "", id: "" },
        google: { key: "", id: "" },
        anthropic: { key: "", id: "" },
      },
      selectedModelId: "gpt-3.5-turbo",

      setApiKey: (provider, key, id) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: { key, id } },
        })),

      setMaskedKey: (provider, masked) =>
        set((state) => ({
          maskedKeys: { ...state.maskedKeys, [provider]: masked },
        })),

      setMaskedKeys: (masked) =>
        set((state) => ({
          maskedKeys: { ...state.maskedKeys, ...masked },
        })),

      setSelectedModelId: (modelId) => set({ selectedModelId: modelId }),

      getApiKey: (provider) => get().apiKeys[provider],
    }),
    {
      name: "ai-store",
    },
  ),
);
