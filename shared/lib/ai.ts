import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { AIProvider } from "@/shared/store/ai-store";

// ─── Model Tiers ───

type ModelTier = "small" | "medium" | "large";

const MODEL_TIER_MAP: Record<AIProvider, Record<ModelTier, string>> = {
  openai: {
    small: "gpt-3.5-turbo",
    medium: "gpt-4-turbo",
    large: "gpt-4o",
  },
  anthropic: {
    small: "claude-3-haiku-20240307",
    medium: "claude-3-5-sonnet-20240620",
    large: "claude-3-opus-20240229",
  },
  google: {
    small: "gemini-2.5-flash",
    medium: "gemini-2.5-flash",
    large: "gemini-2.5-pro",
  },
};

// ─── Model Factory ───

export function createModel(provider: string, apiKey: string, modelId: string) {
  if (provider === "openai") {
    const openai = createOpenAI({ apiKey });
    return openai(modelId);
  } else if (provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey });
    return anthropic(modelId);
  } else if (provider === "google") {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(modelId);
  }
  throw new Error(`Invalid provider: ${provider}`);
}

export function createTieredModel(
  provider: AIProvider,
  apiKey: string,
  tier: ModelTier,
) {
  const modelId = MODEL_TIER_MAP[provider][tier];
  return createModel(provider, apiKey, modelId);
}

// ─── Resolve API Key ───

import { getUserApiKey } from "@/shared/service/server/user-api-key";
import { decrypt } from "@/shared/lib/key-authentication";

export async function resolveApiKey(modelKeyId: string) {
  const apiKeyData = await getUserApiKey(modelKeyId);
  if (!apiKeyData) return null;

  const apiKey = decrypt({
    iv: apiKeyData.ivKey || "",
    tag: apiKeyData.tag || "",
    content: apiKeyData.apiKey || "",
  });

  return { apiKey, provider: apiKeyData.provider as AIProvider };
}

// ─── Agent Error Format ───

export interface AgentError {
  error: {
    code: string;
    message: string;
    required_fields?: string[];
  };
}

export function createAgentError(
  code: string,
  message: string,
  requiredFields?: string[],
): AgentError {
  return {
    error: {
      code,
      message,
      ...(requiredFields ? { required_fields: requiredFields } : {}),
    },
  };
}
