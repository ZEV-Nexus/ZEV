"use client";

import { useMemo } from "react";
import { Member } from "@/shared/types";
import { parseMentions, hasMentions } from "@/shared/lib/mention";
import { cn } from "@/shared/shadcn/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/shared/shadcn/components/ui/hover-card";

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
            <HoverCard key={`mention-${index}`} openDelay={10} closeDelay={100}>
              <HoverCardTrigger>
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1 py-0.5 text-sm font-medium",
                    "bg-accent text-primary",
                    "cursor-pointer hover:bg-primary hover:text-accent transition-colors",
                  )}
                  title={`使用者 ID: ${segment.user?.id}`}
                >
                  @{segment.displayName}
                </span>
              </HoverCardTrigger>
              <HoverCardContent className="flex w-64 flex-col gap-0.5">
                <div className="font-semibold">@{segment.user?.username}</div>
                <div>{segment.displayName}</div>
              </HoverCardContent>
            </HoverCard>
          );
        }
        return <span key={`text-${index}`}>{segment.content}</span>;
      })}
    </span>
  );
}
