"use client";

import React, { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { Button } from "@/shared/shadcn/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/shared/shadcn/components/ui/card";
import {
  RiHeart3Line,
  RiHeart3Fill,
  RiChat1Line,
  RiShareLine,
  RiGithubLine,
  RiStarLine,
  RiGitForkLine,
  RiMore2Line,
  RiDeleteBinLine,
  RiExternalLinkLine,
} from "@remixicon/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/shadcn/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import {
  togglePostLike,
  deletePost as deletePostApi,
} from "@/shared/service/api/post";
import { toast } from "sonner";
import type { Post } from "@/shared/types";
import { formatDistanceToNow } from "date-fns";
import { zhTW, enUS } from "date-fns/locale";
import Link from "next/link";
import Image from "next/image";
import PostComments from "./post-comments";
import { useTranslations } from "next-intl";
import { useLocaleStore } from "@/shared/store/locale-store";

interface PostCardProps {
  post: Post;
  onDeleted?: () => void;
  onLikeToggled?: (postId: string, liked: boolean, count: number) => void;
}

export default function PostCard({
  post,
  onDeleted,
  onLikeToggled,
}: PostCardProps) {
  const { data: session } = useSession();
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const t = useTranslations("feed");
  const { locale } = useLocaleStore();

  const currentUserObjectId = session?.user?.id;
  const isLiked = post.likes?.includes(currentUserObjectId || "");
  const isAuthor = session?.user?.userId === post.author?.userId;

  const handleLike = async () => {
    if (!session?.user) {
      toast.error(t("loginRequired"));
      return;
    }
    setIsLiking(true);
    try {
      const result = await togglePostLike(post.id);
      onLikeToggled?.(post.id, result.liked, result.likesCount);
    } catch {
      toast.error(t("actionFailed"));
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePostApi(post.id);
      toast.success(t("postDeleted"));
      onDeleted?.();
    } catch {
      toast.error(t("deleteFailed"));
    }
  };

  const timeAgo = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), {
        addSuffix: true,
        locale: locale === "zh-TW" ? zhTW : enUS,
      })
    : "";

  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/${post.author?.username}`}>
              <Avatar className="h-10 w-10 hover:ring-2 ring-primary/20 transition-all">
                <AvatarImage
                  src={post.author?.avatar}
                  alt={post.author?.nickname}
                />
                <AvatarFallback>
                  {post.author?.nickname?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link
                href={`/${post.author?.username}`}
                className="text-sm font-semibold text-foreground hover:underline"
              >
                {post.author?.nickname}
              </Link>
              <p className="text-xs text-muted-foreground">
                @{post.author?.username} · {timeAgo}
              </p>
            </div>
          </div>

          {isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <RiMore2Line className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                  {t("deletePost")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-3">
        {/* Text content */}
        {post.content && (
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>
        )}

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div
            className={`grid gap-2 ${
              post.images.length === 1
                ? "grid-cols-1"
                : post.images.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            {post.images.map((url, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-lg overflow-hidden border border-border"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        )}

        {/* GitHub Repo Card */}
        {post.githubRepo && (
          <a
            href={post.githubRepo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors group"
          >
            <RiGithubLine className="h-8 w-8 shrink-0 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                  {post.githubRepo.owner}/{post.githubRepo.repo}
                </p>
                <RiExternalLinkLine className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {post.githubRepo.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {post.githubRepo.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                {post.githubRepo.language && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                    {post.githubRepo.language}
                  </span>
                )}
                {typeof post.githubRepo.stars === "number" && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                    <RiStarLine className="h-3 w-3" />
                    {post.githubRepo.stars.toLocaleString()}
                  </span>
                )}
                {typeof post.githubRepo.forks === "number" && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                    <RiGitForkLine className="h-3 w-3" />
                    {post.githubRepo.forks.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </a>
        )}
      </CardContent>

      <CardFooter className="border-t border-border/50 pt-2 pb-2">
        <div className="flex items-center gap-1 w-full">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 ${isLiked ? "text-red-500 hover:text-red-600" : "text-muted-foreground"}`}
            onClick={handleLike}
            disabled={isLiking}
          >
            {isLiked ? (
              <RiHeart3Fill className="h-4 w-4" />
            ) : (
              <RiHeart3Line className="h-4 w-4" />
            )}
            <span className="text-xs">{post.likes?.length || 0}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => setShowComments(!showComments)}
          >
            <RiChat1Line className="h-4 w-4" />
            <span className="text-xs">{post.commentCount || 0}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground ml-auto"
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin);
              toast.success(t("linkCopied"));
            }}
          >
            <RiShareLine className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>

      {/* Comments Section */}
      {showComments && <PostComments postId={post.id} />}
    </Card>
  );
}
