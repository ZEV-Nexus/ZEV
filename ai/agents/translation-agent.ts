import { generateText } from "ai";
import { createTieredModel, createAgentError } from "@/shared/lib/ai";
import type { AIProvider } from "@/shared/store/ai-store";
import crypto from "crypto";

// ─── Translation Cache ───

interface CacheEntry {
  result: string;
  timestamp: number;
}

const translationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(text: string, targetLang: string): string {
  const hash = crypto
    .createHash("md5")
    .update(`${text}|${targetLang}`)
    .digest("hex");
  return hash;
}

function getFromCache(key: string): string | null {
  const entry = translationCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    translationCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: string): void {
  // Evict old entries if cache is too large
  if (translationCache.size > 1000) {
    const oldest = [...translationCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 100);
    for (const [k] of oldest) {
      translationCache.delete(k);
    }
  }
  translationCache.set(key, { result, timestamp: Date.now() });
}

// ─── Translation Agent ───

const TRANSLATION_SYSTEM_PROMPT = `You are a professional translator.

Rules:
- Translate the given text to the target language accurately.
- Preserve formatting, markdown, code blocks, and special characters.
- Do not add explanations or notes.
- If the text is already in the target language, return it as-is.
- Return ONLY the translated text.`;

export async function translateText(
  provider: AIProvider,
  apiKey: string,
  text: string,
  targetLanguage: string,
): Promise<{ translation: string; cached: boolean }> {
  try {
    // Check cache first
    const cacheKey = getCacheKey(text, targetLanguage);
    const cached = getFromCache(cacheKey);
    if (cached) {
      return { translation: cached, cached: true };
    }

    const model = createTieredModel(provider, apiKey, "small");

    const { text: translated } = await generateText({
      model,
      system: TRANSLATION_SYSTEM_PROMPT,
      prompt: `Translate the following text to ${targetLanguage}:

${text}`,
    });

    // Store in cache
    setCache(cacheKey, translated);

    return { translation: translated, cached: false };
  } catch (error) {
    console.error("Translation Agent Error:", error);
    throw createAgentError(
      "TRANSLATION_FAILED",
      (error as Error)?.message || "Failed to translate text",
    );
  }
}

// ─── Batch Translation ───

export async function translateBatch(
  provider: AIProvider,
  apiKey: string,
  texts: string[],
  targetLanguage: string,
): Promise<{ translations: string[]; cachedCount: number }> {
  let cachedCount = 0;
  const translations = await Promise.all(
    texts.map(async (text) => {
      const result = await translateText(
        provider,
        apiKey,
        text,
        targetLanguage,
      );
      if (result.cached) cachedCount++;
      return result.translation;
    }),
  );

  return { translations, cachedCount };
}
