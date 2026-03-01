import { generateObject } from "ai";
import { z } from "zod";
import { createTieredModel, createAgentError } from "@/shared/lib/ai";
import type { AIProvider } from "@/shared/store/ai-store";

// ─── Intent Schema ───

export const IntentType = z.enum([
  "create_schedule",
  "translate",
  "reply_with_attachment",
  "gmail_draft",
  "none",
]);

export type IntentType = z.infer<typeof IntentType>;

const IntentResultSchema = z.object({
  intent: IntentType,
  confidence: z.number().min(0).max(1),
  side_effects: z.array(z.string()).default([]),
});

export type IntentResult = z.infer<typeof IntentResultSchema>;

// ─── Intent Router Agent ───

const INTENT_SYSTEM_PROMPT = `You are an intent classifier.

## Enforcement Constraints (Mandatory Compliance)

- You may only classify the user's message into one of the following intents.
- If information is insufficient, return intent "none" with low confidence.

Return JSON only.

Possible intents:
- create_schedule: The user wants to create a calendar event, meeting, reminder, or schedule something.
- translate: The user explicitly asks to translate text to another language.
- reply_with_attachment: The message contains or references attachments (images, files) and asks about them.
- gmail_draft: The user wants to compose, reply to, read, or manage emails/Gmail.
- none: General conversation, questions, or anything that doesn't fit above.

Rules:
- Return ONLY ONE primary intent.
- If multiple are possible, choose the one that requires action.
- side_effects: list any secondary intents that could also apply (e.g. ["translate"]).
- confidence: 0.0 to 1.0 representing how certain you are.`;

export async function classifyIntent(
  provider: AIProvider,
  apiKey: string,
  message: string,
  summary?: string,
  hasAttachments?: boolean,
): Promise<IntentResult> {
  try {
    // If message has attachments, bias toward reply_with_attachment
    const attachmentHint = hasAttachments
      ? "\n\n[System note: This message has attachments.]"
      : "";

    const model = createTieredModel(provider, apiKey, "small");

    const { object } = await generateObject({
      model,
      schema: IntentResultSchema,
      system: INTENT_SYSTEM_PROMPT,
      prompt: `User message:
${message}${attachmentHint}

${summary ? `Conversation summary:\n${summary}` : "No conversation summary available."}`,
    });

    return object;
  } catch (error) {
    console.error("Intent Router Error:", error);
    throw createAgentError(
      "INTENT_CLASSIFICATION_FAILED",
      (error as Error)?.message || "Failed to classify intent",
    );
  }
}
