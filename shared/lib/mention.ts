import { Member } from "@/shared/types";

/**
 * Mention 格式: <@userId>
 * 儲存在訊息中的格式是 <@userId>，顯示時透過 userId 查找對應的使用者暱稱
 */

/** 匹配 mention 的正規表達式（不帶 g flag，避免 .test() 的 lastIndex 問題） */
export const MENTION_PATTERN = /<@([a-zA-Z0-9]+)>/;

/** 全域匹配用的 pattern source，需搭配 new RegExp(..., 'g') 使用 */
export const MENTION_PATTERN_SOURCE = MENTION_PATTERN.source;

/**
 * 解析訊息內容中的 mention，將 <@userId> 替換為結構化的片段
 */
export interface MentionSegment {
  type: "text" | "mention";
  content: string;
  user?: Member["user"];
  displayName?: string;
}

/**
 * 將訊息內容解析為文字與 mention 片段
 * @param content - 原始訊息內容
 * @param members - 房間成員列表，用於查找 userId 對應的暱稱
 */
export function parseMentions(
  content: string,
  members: Member[],
): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let lastIndex = 0;

  const regex = new RegExp(MENTION_PATTERN_SOURCE, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    // 加入 mention 前的純文字
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }

    const userId = match[1];
    const member = members.find((m) => m.user?.id === userId);
    const displayName =
      member?.user?.nickname || member?.nickname || "未知使用者";

    segments.push({
      type: "mention",
      content: `@${displayName}`,
      user: member?.user,
      displayName,
    });

    lastIndex = regex.lastIndex;
  }

  // 加入剩餘的純文字
  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      content: content.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * 檢查訊息是否包含 mention
 */
export function hasMentions(content: string): boolean {
  return MENTION_PATTERN.test(content);
}

/**
 * 檢查訊息是否包含特定 userId 的 mention
 */
export function isMentioned(content: string, userId: string): boolean {
  return content.includes(`<@${userId}>`);
}

/**
 * 從訊息中提取所有被 mention 的 userId
 */
export function extractMentionedUserIds(content: string): string[] {
  const regex = new RegExp(MENTION_PATTERN_SOURCE, "g");
  const userIds: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    userIds.push(match[1]);
  }

  return [...new Set(userIds)];
}
