"use client";

import { useMemo } from "react";
import { Member } from "@/shared/types";
import { parseMentions, hasMentions } from "@/shared/lib/mention";
import { cn } from "@/shared/shadcn/lib/utils";
import Markdown from "./markdown";

interface MentionTextProps {
  content: string;
  members: Member[];
  className?: string;
  noMarkdown?: boolean;
}

export function MentionText({
  content,
  members,
  className,
  noMarkdown = false,
}: MentionTextProps) {
  const segments = useMemo(
    () => parseMentions(content, members),
    [content, members],
  );

  // 沒有 mention 時直接返回純文字
  if (!hasMentions(content)) {
    return (
      <div className={cn(className, "min-w-0 overflow-x-auto")}>
        {noMarkdown ? content : <Markdown>{content}</Markdown>}
      </div>
    );
  }

  return (
    <div className={cn(className, "min-w-0 overflow-x-auto")}>
      {segments.map((segment, index) => {
        if (segment.type === "mention") {
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
        return noMarkdown ? (
          <span key={`text-${index}`}>{segment.content}</span>
        ) : (
          <Markdown key={`text-${index}`}>{segment.content}</Markdown>
        );
      })}
    </div>
  );
}
