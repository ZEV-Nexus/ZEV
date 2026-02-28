"use client";

import { useRef, useEffect, memo, useState } from "react";
import { Button } from "@/shared/shadcn/components/ui/button";
import {
  RiSparklingFill,
  RiLoader2Line,
  RiCollapseDiagonalLine,
  RiCloseLine,
  RiExpandDiagonalFill,
} from "@remixicon/react";
import { cn } from "@/shared/shadcn/lib/utils";
import { Card, CardContent } from "@/shared/shadcn/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectItem,
} from "@/shared/shadcn/components/ui/select";
import { AI_MODELS, AIModel, useAIStore } from "@/shared/store/ai-store";
import { UIMessage } from "ai";
import Image from "next/image";
export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  aiMessages: UIMessage[];
  isLoading: boolean;
  onClear: () => void;
  onSelectModel: (model: AIModel) => void;
}

export const AIChatPanel = memo(function AIChatPanel({
  isOpen,
  onToggle,
  aiMessages,
  isLoading,
  onSelectModel,
}: AIChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const { selectedModel } = useAIStore();

  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [aiMessages, isOpen]);

  if (!isOpen) return null;
  const aiModelsGroupByProvider = AI_MODELS.reduce(
    (prev, curr) => {
      if (prev[curr.provider]) prev[curr.provider].push(curr);
      else prev[curr.provider] = [curr];
      return prev;
    },
    {} as Record<string, AIModel[]>,
  );
  return (
    <div
      className={cn(
        "w-full px-4 py-2 animate-in slide-in-from-bottom-4 fade-in duration-300 transition-all",
      )}
    >
      <Card className="shadow-lg border-primary/20 bg-background/95 backdrop-blur-md">
        <CardContent className="p-0">
          <div className="rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 ">
              <div className="flex items-center gap-2">
                <Image
                  src="/icons/zev-icon-apple-IOS-Default.png"
                  alt="AI Assistant"
                  width={25}
                  height={25}
                />

                <span className="text-sm font-semibold">ZEVAI</span>
                {isLoading && (
                  <RiLoader2Line className="h-3.5 w-3.5 animate-spin text-primary" />
                )}
              </div>
              <div className="flex items-center gap-1">
                <Select
                  onValueChange={(e) => {
                    const model = AI_MODELS.find((m) => m.id === e);
                    if (model) onSelectModel(model);
                  }}
                  value={selectedModel?.id || ""}
                >
                  <SelectTrigger className="text-muted-foreground hover:text-foreground">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(aiModelsGroupByProvider).map(
                      ([provider, models]) => (
                        <SelectGroup key={provider}>
                          <SelectLabel>{provider}</SelectLabel>
                          {models.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ),
                    )}
                  </SelectContent>
                </Select>

                {fullScreen ? (
                  <RiCollapseDiagonalLine
                    className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setFullScreen(false)}
                  />
                ) : (
                  <RiExpandDiagonalFill
                    className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setFullScreen(true)}
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <RiCloseLine className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              className={cn(
                "overflow-y-auto",
                fullScreen ? "h-dvh max-h-[calc(100vh-250px)]" : "max-h-50",
              )}
            >
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
                          {msg.role === "assistant" && (
                            <div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                              <RiSparklingFill className="h-4 w-4 text-primary-foreground" />
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
                              {msg.parts
                                .map((part) =>
                                  part.type === "text" ? part.text : "",
                                )
                                .join("")}
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
