import { generateText } from "ai";
import { createTieredModel, createAgentError } from "@/shared/lib/ai";
import type { AIProvider } from "@/shared/store/ai-store";
import type { TaskExtraction } from "./calendar-agent";

// ─── User Confirmation Agent ───

const CONFIRMATION_SYSTEM_PROMPT = `你是一個任務確認助理。

你的職責：
- 將提取的任務資訊以人類可讀的形式呈現
- 每次只問使用者一個明確的問題
- 不要重新提取資料
- 不要呼叫外部 API
- 使用繁體中文

回覆格式：
1. 先列出已提取的資訊
2. 標示不確定的欄位
3. 問一個確認問題`;

export async function formatConfirmationMessage(
  provider: AIProvider,
  apiKey: string,
  task: TaskExtraction,
): Promise<string> {
  try {
    const model = createTieredModel(provider, apiKey, "small");

    const { text } = await generateText({
      model,
      system: CONFIRMATION_SYSTEM_PROMPT,
      prompt: `請確認以下行事曆事件資訊：

${JSON.stringify(task, null, 2)}

請用友善的語氣向使用者確認這些資訊是否正確，特別是標示為 null 或 fuzzy 的欄位。`,
    });

    return text;
  } catch (error) {
    console.error("Confirmation Agent Error:", error);
    throw createAgentError(
      "CONFIRMATION_FORMAT_FAILED",
      (error as Error)?.message || "Failed to format confirmation",
    );
  }
}

// ─── Build fallback confirmation (no LLM) ───

export function buildFallbackConfirmation(task: TaskExtraction): string {
  const lines: string[] = ["📅 我為您提取了以下行程資訊：", ""];

  lines.push(`**標題**：${task.title}`);
  if (task.description) lines.push(`**說明**：${task.description}`);
  lines.push(`**日期**：${task.date || "⚠️ 未指定"}`);
  lines.push(`**時間**：${task.time || "⚠️ 未指定"}`);
  lines.push(
    `**時長**：${task.duration_minutes ? `${task.duration_minutes} 分鐘` : "⚠️ 未指定（預設 60 分鐘）"}`,
  );
  lines.push(`**信心度**：${Math.round(task.confidence * 100)}%`);

  lines.push("");

  const missing: string[] = [];
  if (!task.date) missing.push("日期");
  if (!task.time) missing.push("時間");
  if (!task.duration_minutes) missing.push("時長");

  if (missing.length > 0) {
    lines.push(`需要補充：${missing.join("、")}`);
    lines.push("");
    lines.push("請確認或補充以上資訊。");
  } else {
    lines.push("請確認以上資訊是否正確？");
  }

  return lines.join("\n");
}
