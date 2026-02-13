"use client";

import { useRef, useEffect, memo } from "react";
import { Button } from "@/shared/shadcn/components/ui/button";
import { ScrollArea } from "@/shared/shadcn/components/ui/scroll-area";
import {
  RiSparklingFill,
  RiDeleteBinLine,
  RiLoader2Line,
  RiCollapseDiagonalLine,
} from "@remixicon/react";
import { cn } from "@/shared/shadcn/lib/utils";
import { Card, CardContent } from "@/shared/shadcn/components/ui/card";

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  aiMessages: AIMessage[];
  isLoading: boolean;
  onClear: () => void;
}

export const AIChatPanel = memo(function AIChatPanel({
  isOpen,
  onToggle,
  aiMessages,
  isLoading,
  onClear,
}: AIChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [aiMessages, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="w-full px-4 py-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <Card className="shadow-lg border-primary/20 bg-background/95 backdrop-blur-md">
        <CardContent className="p-0">
          <div className="rounded-xl overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="bg-linear-to-br from-primary to-primary/80 p-1 rounded-md">
                  <RiSparklingFill className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="text-sm font-semibold">AI 助理</span>
                {isLoading && (
                  <RiLoader2Line className="h-3.5 w-3.5 animate-spin text-primary" />
                )}
              </div>
              <div className="flex items-center gap-1">
                {aiMessages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClear();
                    }}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <RiDeleteBinLine className="h-3.5 w-3.5 mr-1" />
                    清除
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <RiCollapseDiagonalLine className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="max-h-[35vh] min-h-[100px]">
              <div className="px-4 py-4">
                {aiMessages.length === 0 ? (
                  <div className="flex flex-col items-center text-center py-8">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <RiSparklingFill className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      我可以如何協助您？
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 px-4">
                      輸入訊息後按 Enter 即可開始對話
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {aiMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200",
                          msg.role === "user" ? "flex-row-reverse" : "flex-row",
                        )}
                      >
                        {/* Avatar */}
                        <div className="shrink-0 mt-0.5">
                          {msg.role === "assistant" ? (
                            <div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                              <RiSparklingFill className="h-4 w-4 text-primary-foreground" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center border border-border/50">
                              <span className="text-xs font-semibold">你</span>
                            </div>
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={cn(
                            "max-w-[85%]",
                            msg.role === "user" ? "text-right" : "text-left",
                          )}
                        >
                          <div
                            className={cn(
                              "inline-block px-4 py-2 rounded-2xl text-sm shadow-sm",
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-muted/50 text-foreground rounded-tl-none",
                            )}
                          >
                            <p className="whitespace-pre-wrap wrap-break-word leading-relaxed text-left">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                          <RiSparklingFill className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div className="px-4 py-2 rounded-2xl bg-muted/50 rounded-tl-none flex items-center">
                          <RiLoader2Line className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
