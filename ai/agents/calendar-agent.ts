import { generateObject } from "ai";
import { z } from "zod";
import { createTieredModel, createAgentError } from "@/shared/lib/ai";
import type { AIProvider } from "@/shared/store/ai-store";

// ─── Task Extraction Schema ───

const TaskExtractionSchema = z.object({
  title: z.string().describe("Event title"),
  description: z.string().optional().describe("Event description"),
  date: z.string().nullable().describe("Date in YYYY-MM-DD format, or null"),
  time: z
    .string()
    .nullable()
    .describe("Time in HH:mm format (24h), or null if ambiguous"),
  duration_minutes: z
    .number()
    .nullable()
    .describe("Duration in minutes, or null"),
  confidence: z.number().min(0).max(1).describe("Extraction confidence"),
  temporal_resolution: z
    .enum(["exact", "fuzzy"])
    .describe("Whether the time info is exact or fuzzy"),
});

export type TaskExtraction = z.infer<typeof TaskExtractionSchema>;

// ─── Calendar Confirmation Schema ───

export const CalendarConfirmationSchema = z.object({
  confirm: z.boolean(),
  date: z.string().optional(),
  time: z.string().optional(),
  title: z.string().optional(),
  duration_minutes: z.number().optional(),
});

export type CalendarConfirmation = z.infer<typeof CalendarConfirmationSchema>;

// ─── Task Extraction Agent ───

const TASK_EXTRACTION_PROMPT = `Extract schedule info from conversation.
If time is ambiguous, set time = null and temporal_resolution = "fuzzy".
Do NOT guess. Only extract what is explicitly stated.
Return JSON only.

Fields:
- title: short event title
- description: optional longer description
- date: YYYY-MM-DD format or null
- time: HH:mm (24h) format or null
- duration_minutes: number or null
- confidence: 0.0 to 1.0
- temporal_resolution: "exact" or "fuzzy"`;

export async function extractTask(
  provider: AIProvider,
  apiKey: string,
  message: string,
  conversationContext?: string,
  currentTime?: string,
): Promise<TaskExtraction> {
  try {
    const model = createTieredModel(provider, apiKey, "medium");

    const { object } = await generateObject({
      model,
      schema: TaskExtractionSchema,
      system: TASK_EXTRACTION_PROMPT,
      prompt: `Current time: ${currentTime || new Date().toISOString()}

User message:
${message}

${conversationContext ? `Recent conversation:\n${conversationContext}` : ""}`,
    });

    return object;
  } catch (error) {
    console.error("Task Extraction Error:", error);
    throw createAgentError(
      "TASK_EXTRACTION_FAILED",
      (error as Error)?.message || "Failed to extract task",
    );
  }
}

// ─── Needs Confirmation Check ───

export function needsConfirmation(task: TaskExtraction): boolean {
  return task.confidence < 0.9;
}

// ─── Build Calendar Event ───

export interface CalendarEvent {
  title: string;
  description?: string;
  start: string;
  duration_minutes: number;
}

export function buildCalendarEvent(
  task: TaskExtraction,
  confirmation?: CalendarConfirmation,
): CalendarEvent | null {
  const date = confirmation?.date || task.date;
  const time = confirmation?.time || task.time;
  const title = confirmation?.title || task.title;
  const duration =
    confirmation?.duration_minutes || task.duration_minutes || 60;

  if (!date) return null;

  const start = time ? `${date}T${time}` : `${date}T00:00`;

  return {
    title,
    description: task.description,
    start,
    duration_minutes: duration,
  };
}
