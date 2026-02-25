"use client";

import { useMemo } from "react";
import { Member } from "@/shared/types";
import { parseMentions, hasMentions } from "@/shared/lib/mention";
import { cn } from "@/shared/shadcn/lib/utils";

interface MentionTextProps {
  content: string;
  members: Member[];
  className?: string;
}

/**
 * 將訊息內容中的 <@userId> 解析為高亮的 mention 標籤
 * 透過 userId 查找對應的使用者暱稱來顯示
 */
export function MentionText({ content, members, className }: MentionTextProps) {
  const segments = useMemo(
    () => parseMentions(content, members),
    [content, members],
  );

  // 沒有 mention 時直接返回純文字
  if (!hasMentions(content)) {
    return <span className={className}>{content}</span>;
  }

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "mention") {
          console.log(segment.user);
          return (
            <span
              key={segment.user?.id}
              className={cn(
                "inline-flex items-center rounded px-1 py-0.5 text-sm font-medium",
                "bg-accent text-primary",
                "cursor-pointer hover:bg-primary hover:text-accent transition-colors",
              )}
              title={`使用者 ID: ${segment.user?.id}`}
            >
              @{segment.displayName}
            </span>
          );
        }
        return <span key={`text-${index}`}>{segment.content}</span>;
      })}
    </span>
  );
}
