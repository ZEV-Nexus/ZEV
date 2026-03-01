"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/shared/shadcn/components/ui/button";
import { ScrollArea } from "@/shared/shadcn/components/ui/scroll-area";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import {
  RiArrowLeftLine,
  RiImageLine,
  RiVideoLine,
  RiFileTextLine,
  RiLinksLine,
  RiLoader2Line,
  RiDownloadLine,
  RiExternalLinkLine,
  RiFileLine,
} from "@remixicon/react";
import {
  getRoomSharedMedia,
  RoomMediaItem,
  RoomLinkItem,
} from "@/shared/service/api/room";
import { useTranslations } from "next-intl";

type MediaPanelType = "image" | "file" | "link";

interface SharedMediaPanelProps {
  type: MediaPanelType;
  roomId: string;
  onBack: () => void;
}

export function SharedMediaPanel({
  type,
  roomId,
  onBack,
}: SharedMediaPanelProps) {
  const [items, setItems] = useState<RoomMediaItem[] | RoomLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("chatSettings");

  const fetchMedia = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getRoomSharedMedia(roomId, type);
      setItems(data || []);
    } catch (err) {
      console.error("Failed to fetch shared media:", err);
      setError(t("mediaLoadError"));
    } finally {
      setLoading(false);
    }
  }, [roomId, type, t]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const title =
    type === "image"
      ? t("imagesAndVideos")
      : type === "file"
        ? t("files")
        : t("links");

  const icon =
    type === "image" ? (
      <RiImageLine className="h-4 w-4" />
    ) : type === "file" ? (
      <RiFileTextLine className="h-4 w-4" />
    ) : (
      <RiLinksLine className="h-4 w-4" />
    );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onBack}
        >
          <RiArrowLeftLine className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RiLoader2Line className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={fetchMedia}
            >
              {t("retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              {icon}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {type === "image"
                ? t("noImages")
                : type === "file"
                  ? t("noFiles")
                  : t("noLinks")}
            </p>
          </div>
        ) : type === "image" ? (
          <ImageGrid items={items as RoomMediaItem[]} />
        ) : type === "file" ? (
          <FileList items={items as RoomMediaItem[]} />
        ) : (
          <LinkList items={items as RoomLinkItem[]} />
        )}
      </ScrollArea>
    </div>
  );
}

function ImageGrid({ items }: { items: RoomMediaItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-1 p-2">
      {items.map((item) => {
        const isVideo =
          item.mimeType?.startsWith("video/") || item.resourceType === "video";

        return (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-square overflow-hidden rounded-md bg-muted group cursor-pointer"
          >
            {isVideo ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <RiVideoLine className="h-8 w-8 text-muted-foreground" />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.url}
                alt={item.filename}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            {isVideo && (
              <div className="absolute bottom-1 right-1">
                <RiVideoLine className="h-3 w-3 text-white drop-shadow" />
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function FileList({ items }: { items: RoomMediaItem[] }) {
  return (
    <div className="flex flex-col p-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
        >
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <RiFileLine className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.filename}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatFileSize(item.size)}</span>
              <span>·</span>
              <span>{item.senderNickname}</span>
            </div>
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <RiDownloadLine className="h-4 w-4" />
            </Button>
          </a>
        </div>
      ))}
    </div>
  );
}

function LinkList({ items }: { items: RoomLinkItem[] }) {
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="flex flex-col p-2">
      {items.map((item, index) => (
        <a
          key={`${item.url}-${index}`}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
        >
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <RiExternalLinkLine className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-primary group-hover:underline">
              {getDomain(item.url)}
            </p>
            <p className="text-xs text-muted-foreground truncate">{item.url}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Avatar className="h-4 w-4">
                {item.senderAvatar && <AvatarImage src={item.senderAvatar} />}
                <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                  {item.senderNickname?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <span>{item.senderNickname}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
