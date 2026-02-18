"use client";

import { memo, useState } from "react";
import { Message } from "@/shared/types";
import { Avatar, AvatarFallback } from "@/shared/shadcn/components/ui/avatar";
import { cn } from "@/shared/shadcn/lib/utils";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  RiReplyLine,
  RiFileTextLine,
  RiDownloadLine,
  RiEditLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiCheckLine,
  RiCloseLine,
  RiMoreLine,
} from "@remixicon/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/shadcn/components/ui/dropdown-menu";

import { PhotoProvider, PhotoView } from "react-photo-view";
import { CldImage } from "next-cloudinary";
import { toast } from "sonner";

// Position of a message within a group
export type BubblePosition = "single" | "first" | "middle" | "last";

interface ChatMessageItemProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar: boolean;
  showName: boolean;
  showTimestamp: boolean;
  bubblePosition: BubblePosition;
  onScrollToMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyMessage?: (message: Message) => void;
}

function getBubbleRadius(
  isCurrentUser: boolean,
  position: BubblePosition,
): string {
  const r = 20;
  const s = 4;

  if (isCurrentUser) {
    switch (position) {
      case "single":
        return `${r}px ${r}px ${s}px ${r}px`;
      case "first":
        return `${r}px ${r}px ${s}px ${r}px`;
      case "middle":
        return `${r}px ${s}px ${s}px ${r}px`;
      case "last":
        return `${r}px ${s}px ${r}px ${r}px`;
    }
  } else {
    switch (position) {
      case "single":
        return `${r}px ${r}px ${r}px ${s}px`;
      case "first":
        return `${r}px ${r}px ${r}px ${s}px`;
      case "middle":
        return `${s}px ${r}px ${r}px ${s}px`;
      case "last":
        return `${s}px ${r}px ${r}px ${r}px`;
    }
  }
}

function formatTime(date: string) {
  return format(new Date(date), "HH:mm", { locale: zhTW });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

interface MessageActionsProps {
  isCurrentUser: boolean;
  isAttachment: boolean;
  message: Message;
  onReplyMessage?: (message: Message) => void;
  handleCopy: () => void;
  handleDownload?: () => void;
  onDeleteMessage?: (messageId: string) => void;
  setEditContent: (content: string) => void;
  setIsEditing: (isEditing: boolean) => void;
  formatTime: (date: string) => string;
  showEdit?: boolean;
}

const MessageActions = ({
  isCurrentUser,
  isAttachment,
  message,
  onReplyMessage,
  handleCopy,
  handleDownload,
  onDeleteMessage,
  setEditContent,
  setIsEditing,
  formatTime,
  showEdit,
}: MessageActionsProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150",
        isCurrentUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <button
        onClick={() => onReplyMessage?.(message)}
        className="p-1.5 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        title="回覆"
      >
        <RiReplyLine className="h-3.5 w-3.5" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1.5 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="更多"
          >
            <RiMoreLine className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={isCurrentUser ? "end" : "start"}
          className="w-36"
        >
          {isAttachment && (
            <DropdownMenuItem onClick={handleDownload}>
              <RiDownloadLine className="h-4 w-4 mr-2" />
              下載
            </DropdownMenuItem>
          )}
          {message.content && !isAttachment && (
            <DropdownMenuItem onClick={handleCopy}>
              <RiFileCopyLine className="h-4 w-4 mr-2" />
              複製
            </DropdownMenuItem>
          )}

          {isCurrentUser && showEdit && message.content && (
            <DropdownMenuItem
              onClick={() => {
                setEditContent(message.content || "");
                setIsEditing(true);
              }}
            >
              <RiEditLine className="h-4 w-4 mr-2" />
              編輯
            </DropdownMenuItem>
          )}

          {/* Delete - only for current user */}
          {isCurrentUser && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteMessage?.(message.id)}
                className="text-destructive focus:text-destructive"
              >
                <RiDeleteBinLine className="h-4 w-4 mr-2" />
                刪除
              </DropdownMenuItem>
            </>
          )}
          <span
            className={cn(
              "text-[10px] text-muted-foreground px-2 shrink-0 pb-0.5 select-none",
            )}
          >
            {formatTime(message.createdAt)}
          </span>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const ChatMessageItem = memo(function ChatMessageItem({
  message,
  isCurrentUser,
  showAvatar,
  showName,
  showTimestamp,
  bubblePosition,
  onScrollToMessage,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
}: ChatMessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
  };

  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEditMessage?.(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(message.content || "");
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    }
    if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    if (!fileUrl) return;
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(error);
      toast.error("下載失敗");
    }
  };

  // Deleted message
  if (message.deletedAt) {
    return <></>;
  }

  return (
    <div
      className={cn(
        "flex group/msg px-4 md:px-6 self-start ",
        isCurrentUser ? "justify-end" : "justify-start",
        showAvatar ? "mt-3" : "mt-0.5",
      )}
    >
      {!isCurrentUser && (
        <div className="w-7 md:w-8 shrink-0 mr-2">
          {showAvatar && (
            <Avatar className="h-7 w-7 md:h-8 md:w-8">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {message.member?.user?.nickname?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col min-w-0",
          isCurrentUser ? "items-end" : "items-start",
          "max-w-[85%] md:max-w-[60%]",
        )}
      >
        {showName && !isCurrentUser && (
          <span className="text-xs font-medium text-muted-foreground mb-0.5 ml-1">
            {message.member?.user?.nickname}
          </span>
        )}

        {message.replyTo && (
          <div
            className={cn(
              "flex items-center gap-2",
              isCurrentUser ? "flex-row-reverse" : "flex-row",
            )}
          >
            <div className="h-8 w-1 bg-primary rounded-full shrink-0" />
            <button
              onClick={() => {
                const replyId =
                  typeof message.replyTo === "string"
                    ? message.replyTo
                    : message.replyTo?.id;
                if (replyId) onScrollToMessage?.(replyId);
              }}
              className={cn(
                "flex flex-col gap-0.5 text-xs text-muted-foreground mb-1 px-2.5 py-1.5 rounded-xl cursor-pointer",
                "bg-muted/40 hover:bg-muted/60 transition-colors border-primary/40",

                isCurrentUser
                  ? "items-end  rounded-l-full"
                  : "items-start rounded-r-full",
              )}
            >
              <div className="flex items-center gap-1.5 font-medium  text-primary/80">
                <RiReplyLine className="h-3 w-3 shrink-0" />
                <span>
                  {typeof message.replyTo === "object"
                    ? message.replyTo.member?.user?.nickname
                    : "回覆訊息"}
                </span>
              </div>
              <p className="truncate max-w-[200px] opacity-70 italic text-[11px]">
                {typeof message.replyTo === "object"
                  ? message.replyTo.content
                  : "查看原訊息"}
              </p>
            </button>
          </div>
        )}

        {/* Content Bubble */}
        {(message.content || isEditing) && (
          <div
            className={cn(
              "flex items-center gap-0.5 relative",
              isCurrentUser ? "flex-row-reverse" : "flex-row",
              message.attachments && message.attachments.length > 0 && "mb-1",
            )}
          >
            <div
              className={cn(
                "relative px-3 py-[7px] md:px-[14px] md:py-[10px]",
                isCurrentUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-foreground",
              )}
              style={{
                borderRadius: getBubbleRadius(isCurrentUser, bubblePosition),
              }}
            >
              {isEditing ? (
                <div className="flex flex-col gap-1.5 min-w-[200px]">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    className={cn(
                      "text-[15px] leading-[1.4] bg-transparent border-0 resize-none outline-none w-full min-h-[40px]",
                      isCurrentUser
                        ? "text-primary-foreground placeholder:text-primary-foreground/50"
                        : "text-foreground placeholder:text-muted-foreground",
                    )}
                    autoFocus
                    rows={2}
                  />
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={handleEditCancel}
                      className="p-1 rounded hover:bg-black/10 transition-colors cursor-pointer"
                    >
                      <RiCloseLine className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleEditSubmit}
                      className="p-1 rounded hover:bg-black/10 transition-colors cursor-pointer"
                    >
                      <RiCheckLine className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[15px] whitespace-pre-wrap wrap-break-word leading-[1.4]">
                  {message.content}
                </p>
              )}
            </div>

            {!isEditing && (
              <div className="flex flex-col items-end">
                <MessageActions
                  isCurrentUser={isCurrentUser}
                  message={message}
                  isAttachment={false}
                  onReplyMessage={onReplyMessage}
                  handleCopy={handleCopy}
                  onDeleteMessage={onDeleteMessage}
                  setEditContent={setEditContent}
                  setIsEditing={setIsEditing}
                  formatTime={formatTime}
                  showEdit={true}
                />
                {message.editedAt && !message.attachments?.length && (
                  <span className={cn("text-[10px] mt-0.5 block opacity-50")}>
                    Edited
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Attachments Bubble */}
        {message.attachments &&
          message.attachments.length > 0 &&
          message.attachments.map((att) => (
            <div
              key={att.id}
              className={cn(
                "flex items-center gap-0.5 relative",
                isCurrentUser ? "flex-row-reverse" : "flex-row",
              )}
            >
              <div
                className={cn(
                  "relative ",
                  isCurrentUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-foreground",
                )}
                style={{
                  borderRadius: getBubbleRadius(isCurrentUser, bubblePosition),
                }}
              >
                <PhotoProvider>
                  <div className="flex flex-col gap-1.5">
                    {att.mimeType?.startsWith("image/") ? (
                      <PhotoView src={att.url}>
                        <CldImage
                          src={att.url}
                          alt={att.filename}
                          width={500}
                          height={500}
                          className="rounded-md max-w-full max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity w-auto h-auto"
                          preserveTransformations
                        />
                      </PhotoView>
                    ) : att.mimeType?.startsWith("video/") ? (
                      <video
                        key={att.id}
                        src={att.url}
                        controls
                        className="rounded-md max-w-full max-h-[300px] object-cover"
                      />
                    ) : (
                      <a
                        key={att.id}
                        href={att.url}
                        onClick={(e) => {
                          e.preventDefault();
                          handleDownload(att.url, att.filename);
                        }}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-decoration-none group/file",
                          isCurrentUser
                            ? "bg-primary-foreground/10 hover:bg-primary-foreground/20 text-white"
                            : "bg-background/50 hover:bg-background/80 text-foreground",
                        )}
                      >
                        <RiFileTextLine className="h-4 w-4 shrink-0 opacity-70" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate ">
                            {att.filename}
                          </p>
                          <p className="text-[10px] opacity-60">
                            {formatFileSize(att.size)}
                          </p>
                        </div>
                        <RiDownloadLine className="h-3.5 w-3.5 opacity-60 group-hover/file:opacity-100 transition-opacity" />
                      </a>
                    )}
                  </div>
                </PhotoProvider>
              </div>

              {!isEditing && (
                <div className="flex flex-col items-end">
                  <MessageActions
                    isCurrentUser={isCurrentUser}
                    message={message}
                    isAttachment={true}
                    onReplyMessage={onReplyMessage}
                    handleCopy={handleCopy}
                    onDeleteMessage={onDeleteMessage}
                    setEditContent={setEditContent}
                    setIsEditing={setIsEditing}
                    formatTime={formatTime}
                    showEdit={!!message.content} // Only show edit if content exists
                  />
                  {message.editedAt && (
                    <span className={cn("text-[10px] mt-0.5 block opacity-50")}>
                      Edited
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

        {showTimestamp && !isEditing && (
          <span className="text-[10px] text-muted-foreground mt-1 px-1 select-none">
            {formatTime(message.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
});
