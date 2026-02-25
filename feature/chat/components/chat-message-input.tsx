"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { Button } from "@/shared/shadcn/components/ui/button";
import { Member, Message } from "@/shared/types";
import {
  Mention,
  MentionContent,
  MentionInput,
  MentionItem,
} from "@/shared/shadcn/components/ui/mention";
import {
  RiSendPlaneLine,
  RiAttachmentLine,
  RiEmotionLine,
  RiImageAddLine,
  RiFileTextLine,
  RiCloseLine,
  RiReplyLine,
  RiAtLine,
} from "@remixicon/react";
import { cn } from "@/shared/shadcn/lib/utils";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { Textarea } from "@/shared/shadcn/components/ui/textarea";
import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerFooter,
} from "@/components/ui/emoji-picker";

interface ChatMessageInputProps {
  onSendMessage: (
    content: string,
    attachments?: File[],
    replyToId?: string,
  ) => void;
  roomId: string;
  members?: Member[];
  isAIMode?: boolean;
  replyingMessage?: Message | null;
  onCancelReply?: () => void;
  onTyping?: () => void;
}

export function ChatMessageInput({
  onSendMessage,
  members = [],
  isAIMode = false,
  replyingMessage,
  onCancelReply,
  onTyping,
}: ChatMessageInputProps) {
  const [message, setMessage] = useState("");
  const [mentionValues, setMentionValues] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [mentionOpen, setMentionOpen] = useState(false);

  // 將成員列表轉換成 mention 選項，使用 userId 作為 value
  const mentionSuggestions = useMemo(
    () =>
      members.map((member) => ({
        id: member.user?.id || member.id,
        label: member.user?.nickname || member.nickname,
        avatar: member.user?.avatar,
      })),
    [members],
  );

  // label → userId 的對應表
  const labelToIdMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of mentionSuggestions) {
      map.set(member.label, member.id);
    }
    return map;
  }, [mentionSuggestions]);

  /**
   * 將輸入中已選取的 mention（@nickname）轉換為 <@userId> 格式送出。
   * 只轉換透過 onValueChange 追蹤到的已確認 mention。
   */
  const convertMentionsForSend = useCallback(
    (rawContent: string): string => {
      let result = rawContent;
      for (const label of mentionValues) {
        const userId = labelToIdMap.get(label);
        if (userId && result.includes(`@${label}`)) {
          result = result.replaceAll(`@${label}`, `<@${userId}>`);
        }
      }
      return result;
    },
    [mentionValues, labelToIdMap],
  );

  // 當焦點離開整個輸入區域（包含 emoji picker）時收起 emoji picker
  const handleContainerBlur = useCallback((e: React.FocusEvent) => {
    const container = inputContainerRef.current;
    if (container && !container.contains(e.relatedTarget as Node)) {
      setEmojiOpen(false);
      setIsFocused(false);
    }
  }, []);

  const handleEmojiSelect = useCallback(
    (emoji: { emoji: string }) => {
      setMessage((prev) => prev + emoji.emoji);
      onTyping?.();

      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [onTyping],
  );

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return;

    const contentToSend = convertMentionsForSend(message);
    onSendMessage(contentToSend, attachments, replyingMessage?.id);
    setMessage("");
    setMentionValues([]);
    setAttachments([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !mentionOpen &&
      e.nativeEvent.isComposing === false
    ) {
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
          <div className="mb-3 animate-in slide-in-from-bottom-2 fade-in duration-200 overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl overflow-hidden bg-primary/5 border border-primary/10 group relative">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="h-8 w-1 bg-primary rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <RiReplyLine className="h-3 w-3 text-primary" />
                    <span className="text-xs font-semibold text-primary">
                      正在回覆 {replyingMessage.member?.user?.nickname}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
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

        {/* Input Area with Mention */}
        <div
          ref={inputContainerRef}
          onBlur={handleContainerBlur}
          onFocus={() => setIsFocused(true)}
          className="relative"
        >
          {/* Emoji Picker */}
          {emojiOpen && (
            <div className="absolute bottom-full left-0 mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <EmojiPicker
                className="h-80 w-80 border shadow-lg"
                onEmojiSelect={handleEmojiSelect}
              >
                <EmojiPickerSearch placeholder="搜尋表情符號..." />
                <EmojiPickerContent />
                <EmojiPickerFooter />
              </EmojiPicker>
            </div>
          )}

          <div
            className={cn(
              "relative flex items-center gap-2 p-2 rounded-xl transition-all duration-200",
              isFocused ? "bg-muted/50 ring-1 ring-primary/20" : "bg-muted/30",
            )}
          >
            {/* Left Actions */}
            <div className="flex items-center gap-1">
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
                className={cn(
                  "h-8 w-8 transition-colors",
                  emojiOpen
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary",
                )}
                onClick={() => setEmojiOpen((prev) => !prev)}
              >
                <RiEmotionLine className="h-5 w-5" />
              </Button>
            </div>

            <Mention
              value={mentionValues}
              onValueChange={setMentionValues}
              onInputValueChange={(val) => {
                setMessage(val);
                onTyping?.();
              }}
              inputValue={message}
              onOpenChange={setMentionOpen}
              className="flex-1"
            >
              <MentionInput
                ref={inputRef}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                asChild
                placeholder={
                  isAIMode
                    ? "詢問 AI 助理..."
                    : "輸入訊息... (@ 提及成員, Shift+Enter 換行)"
                }
                className="flex-1 min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              >
                <Textarea value={message} className="max-h-[7lh]" />
              </MentionInput>
              <MentionContent>
                {mentionSuggestions.length > 0 ? (
                  mentionSuggestions.map((member) => (
                    <MentionItem key={member.id} value={member.label}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {member.avatar ? (
                            <AvatarImage
                              src={member.avatar}
                              alt={member.label}
                            />
                          ) : null}
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {member.label.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{member.label}</span>
                      </div>
                    </MentionItem>
                  ))
                ) : (
                  <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                    <RiAtLine className="h-4 w-4 mx-auto mb-1 opacity-50" />
                    沒有可提及的成員
                  </div>
                )}
              </MentionContent>
            </Mention>

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={!message.trim() && attachments.length === 0}
              size="icon"
              className={cn("transition-all duration-200")}
            >
              <RiSendPlaneLine />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
