import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText } from "ai";

import { getUserApiKey } from "@/shared/service/server/user-api-key";
import { getCurrentUser } from "@/shared/service/server/auth";
import { decrypt } from "@/shared/lib/key-authentication";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, modelKeyId, modelId } = await req.json();
  console.log(messages, modelKeyId, modelId);

  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!modelKeyId) {
    return new Response("Model Key ID is required", { status: 400 });
  }

  let model;

  const apiKeyData = await getUserApiKey(modelKeyId);
  if (!apiKeyData) {
    return new Response(`Missing API Key for model key ID: ${modelKeyId}`, {
      status: 401,
    });
  }
  const apiKey = decrypt({
    iv: apiKeyData?.ivKey || "",
    tag: apiKeyData?.tag || "",
    content: apiKeyData?.apiKey || "",
  });

  try {
    if (apiKeyData.provider === "openai") {
      if (!apiKey) {
        return new Response("Missing OpenAI API Key", { status: 401 });
      }
      const openai = createOpenAI({ apiKey });
      model = openai(modelId);
    } else if (apiKeyData.provider === "anthropic") {
      if (!apiKey) {
        return new Response("Missing Anthropic API Key", { status: 401 });
      }
      const anthropic = createAnthropic({ apiKey });
      model = anthropic(modelId);
    } else if (apiKeyData.provider === "google") {
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
