import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText } from "ai";

import { getUserApiKey } from "@/shared/service/server/user-api-key";
import { getCurrentUser } from "@/shared/service/server/auth";
import { decrypt } from "@/shared/lib/key-authcation";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, modelId } = await req.json();
  console.log(messages, modelId);

  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!modelId) {
    return new Response("Model ID is required", { status: 400 });
  }

  let model;
  const provider = modelId.startsWith("gpt")
    ? "openai"
    : modelId.startsWith("claude")
      ? "anthropic"
      : modelId.startsWith("gemini")
        ? "google"
        : null;

  if (!provider) {
    return new Response("Invalid Model ID", { status: 400 });
  }
  const apiKeyData = await getUserApiKey(user.id, provider);
  if (!apiKeyData) {
    return new Response(`Missing API Key for provider: ${provider}`, {
      status: 401,
    });
  }
  const apiKey = decrypt({
    iv: apiKeyData?.ivKey || "",
    tag: apiKeyData?.tag || "",
    content: apiKeyData?.apiKey || "",
  });

  try {
    if (modelId.startsWith("gpt")) {
      if (!apiKey) {
        return new Response("Missing OpenAI API Key", { status: 401 });
      }
      const openai = createOpenAI({ apiKey });
      model = openai(modelId);
    } else if (modelId.startsWith("claude")) {
      if (!apiKey) {
        return new Response("Missing Anthropic API Key", { status: 401 });
      }
      const anthropic = createAnthropic({ apiKey });
      model = anthropic(modelId);
    } else if (modelId.startsWith("gemini")) {
      if (!apiKey) {
        return new Response("Missing Google API Key", { status: 401 });
      }
      const google = createGoogleGenerativeAI({ apiKey });
      model = google(modelId);
    } else {
      return new Response("Invalid Model ID", { status: 400 });
    }

    console.log(messages);

    const result = streamText({
      model: model,
      messages: await convertToModelMessages(messages),
      system:
        "You are a helpful AI assistant. Answer the user's questions to the best of your ability.",
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error("AI Chat Error:", error);
    return new Response((error as Error)?.message || "Internal Server Error", {
      status: 500,
    });
  }
}
