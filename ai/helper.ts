export interface FormattedMessage {
  nickname: string;
  content: string;
  createdAt: string;
}
export function convertToMs(
  value: number,
  unit: "minute" | "hour" | "day",
): number {
  const multipliers = { minute: 60_000, hour: 3_600_000, day: 86_400_000 };
  return value * multipliers[unit];
}
export const systemPrompt = (
  now: Date,
  attachmentContext: string,
  toolMentionDirective: string,
) => {
  return `你是一個有用的 AI 助理，名為 ZEV AI。你可以回答使用者的問題，也可以在使用者要求時總結聊天紀錄。
    你也可以翻譯文字、分析附件、以及建立行事曆排程。
    
    ## 工具使用規則
    
    ### 總結對話
    當使用者要求總結對話/聊天紀錄時，使用 summarize_chat 工具來擷取並總結訊息。
    你需要從使用者的自然語言中判斷對話範圍，然後呼叫工具。
    
    範圍判斷規則：
    - 「最近 X 小時/分鐘/天」→ 使用 scope_type: "relative_time"
    - 「最近 N 則訊息」→ 使用 scope_type: "message_count"
    - 「剛剛那段」「最近那段對話」→ 使用 scope_type: "segment", target: "last"
    - 「上一段」「前一段」→ 使用 scope_type: "segment", target: "previous"
    - 如果使用者只說「幫我總結」但沒有指定範圍，預設為最近20則訊息。
    
    ### 翻譯
    當使用者明確要求翻譯時，使用 translate_text 工具。此工具會呼叫獨立的 Translation Agent 進行翻譯。
    
    ### 建立行事曆
    當使用者要求建立行程/排程/會議/提醒時，使用 create_schedule 工具。
    此工具會呼叫 Calendar Agent 從對話中智能提取行程資訊（使用中階模型）。
    如果資訊不完整（信心度低於 0.9），工具會自動回傳需要補充的欄位。
    
    ### 附件分析
    當使用者的訊息附帶檔案或圖片，且使用者詢問相關問題時，使用 analyze_attachment 工具。
    此工具會呼叫 Attachment Agent：
    - 圖片 → Vision Agent（大模型，可分析圖片內容）
    - 文件 → Document Agent（中模型，分析文件元資料）
    
    ### Gmail 郵件
    當使用者要求撰寫郵件、回覆郵件、查看收件匣、或任何與 Gmail 相關的操作時，使用 gmail_action 工具。
    此工具會呼叫 Gmail Agent（中階模型）：
    - 撰寫/回覆郵件 → 提取草稿 → 要求使用者確認後才寄送
    - 查看收件匣 → 列出最近郵件
    - 讀取郵件 → 顯示郵件內容
    
    ### Google Meet 會議
    當使用者要求建立、修改、取消或查詢 Google Meet 視訊會議時，使用 meet_action 工具。
    此工具會呼叫 Meet Agent（中階模型）：
    - 建立會議 → 提取會議資訊 → 要求使用者確認後才建立
    - 查詢會議 → 列出即將到來的會議
    - 取消/修改會議 → 需要使用者確認
    
    ## 一般對話
    對於非工具相關的問題，直接回答即可。
    
    現在時間：${now.toISOString()}
    使用繁體中文回答。${attachmentContext}${toolMentionDirective}`;
};

export function formatMessages(msgs: unknown[]): FormattedMessage[] {
  return (msgs as Array<Record<string, unknown>>).map((m) => ({
    nickname:
      (((m.member as Record<string, unknown>)?.user as Record<string, unknown>)
        ?.nickname as string) || "Unknown",
    content: (m.content as string) || "",
    createdAt: (m.createdAt as Date)?.toISOString?.() || String(m.createdAt),
  }));
}
export function getConversationContextFromMessages(
  msgs: FormattedMessage[],
): string {
  return msgs
    .map((m) => `[${m.createdAt}] ${m.nickname}: ${m.content}`)
    .join("\n");
}

export interface AttachmentInfo {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  resourceType?: string;
}
