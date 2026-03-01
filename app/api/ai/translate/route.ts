import { getCurrentUser } from "@/shared/service/server/auth";
import { resolveApiKey } from "@/shared/lib/ai";
import { apiResponse } from "@/shared/service/server/response";
import { translateText, translateBatch } from "@/ai/agents/translation-agent";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { text, texts, targetLanguage, modelKeyId } = await req.json();

  const user = await getCurrentUser();
  if (!user) {
    return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
  }

  if (!modelKeyId) {
    return apiResponse({
      ok: false,
      message: "Model Key ID is required",
      status: 400,
    });
  }

  if (!targetLanguage) {
    return apiResponse({
      ok: false,
      message: "targetLanguage is required",
      status: 400,
    });
  }

  const resolved = await resolveApiKey(modelKeyId);
  if (!resolved) {
    return apiResponse({
      ok: false,
      message: "Invalid API Key",
      status: 401,
    });
  }

  const { apiKey, provider } = resolved;

  try {
    // Batch translation
    if (Array.isArray(texts) && texts.length > 0) {
      const result = await translateBatch(
        provider,
        apiKey,
        texts,
        targetLanguage,
      );
      return apiResponse({
        data: {
          translations: result.translations,
          cachedCount: result.cachedCount,
          targetLanguage,
        },
      });
    }

    // Single translation
    if (!text) {
      return apiResponse({
        ok: false,
        message: "text or texts is required",
        status: 400,
      });
    }

    const result = await translateText(provider, apiKey, text, targetLanguage);

    return apiResponse({
      data: {
        translation: result.translation,
        cached: result.cached,
        targetLanguage,
      },
    });
  } catch (error: unknown) {
    console.error("Translate Route Error:", error);
    return apiResponse({
      ok: false,
      message: (error as Error)?.message || "Translation failed",
      status: 500,
    });
  }
}
