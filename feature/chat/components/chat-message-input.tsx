"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/shared/shadcn/components/ui/button";
import { Textarea } from "@/shared/shadcn/components/ui/textarea";
import { Message } from "@/shared/types";
import {
  RiSendPlaneLine,
  RiAttachmentLine,
  RiEmotionLine,
  RiImageAddLine,
  RiFileTextLine,
  RiCloseLine,
  RiReplyLine,
} from "@remixicon/react";
import { cn } from "@/shared/shadcn/lib/utils";
import { toast } from "sonner";

interface ChatMessageInputProps {
  onSendMessage: (
    content: string,
    attachments?: File[],
    replyToId?: string,
  ) => void;
  roomId: string;
  isAIMode?: boolean;
  replyingMessage?: Message | null;
  onCancelReply?: () => void;
}

export function ChatMessageInput({
  onSendMessage,
  roomId,
  isAIMode = false,
  replyingMessage,
  onCancelReply,
}: ChatMessageInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return;

    onSendMessage(message, attachments, replyingMessage?.id);
    setMessage("");
    setAttachments([]);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB

    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        toast.error(`${file.name} 超過 10MB 限制`);
        return false;
      }
      return true;
    });

    setAttachments((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="bg-background/95 backdrop-blur-sm mb-2">
      <div className="px-4 py-3">
        {/* Reply Preview */}
        {replyingMessage && (
          <div className="mb-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10 group relative">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="h-8 w-1 bg-primary rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <RiReplyLine className="h-3 w-3 text-primary" />
                    <span className="text-xs font-semibold text-primary">
                      正在回覆 {replyingMessage.member?.user?.nickname}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate leading-relaxed">
                    {replyingMessage.content || "附件內容"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                onClick={onCancelReply}
              >
                <RiCloseLine className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 group hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {file.type.startsWith("image/") ? (
                    <RiImageAddLine className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <RiFileTextLine className="h-4 w-4 text-primary shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeAttachment(index)}
                >
                  <RiCloseLine className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div
          className={cn(
            "relative flex items-center gap-2 p-2  rounded-xl transition-all duration-200",
            isFocused ? "bg-muted/50 ring-1 ring-primary/20" : "bg-muted/30",
          )}
        >
          {/* Left Actions */}
          <div className="flex items-center gap-1 ">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <RiAttachmentLine className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
            >
              <RiEmotionLine className="h-5 w-5" />
            </Button>
          </div>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              isAIMode ? "詢問 AI 助理..." : "輸入訊息... (Shift+Enter 換行)"
            }
            className="flex-1 min-h-[40px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            rows={1}
          />

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!message.trim() && attachments.length === 0}
            size="icon"
            className={cn(" transition-all duration-200 ")}
          >
            <RiSendPlaneLine />
          </Button>
        </div>
      </div>
    </div>
  );
}
