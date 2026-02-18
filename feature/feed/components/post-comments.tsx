"use client";

import React, { useState, useEffect } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { Button } from "@/shared/shadcn/components/ui/button";
import { Input } from "@/shared/shadcn/components/ui/input";
import { RiSendPlaneLine, RiLoader2Line } from "@remixicon/react";
import { useSession } from "next-auth/react";
import {
  fetchComments,
  createComment as createCommentApi,
} from "@/shared/service/api/post";
import { toast } from "sonner";
import type { Comment } from "@/shared/types";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import Link from "next/link";

interface PostCommentsProps {
  postId: string;
}

export default function PostComments({ postId }: PostCommentsProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      const data = await fetchComments(postId);
      setComments(data);
    } catch {
      toast.error("載入留言失敗");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !session?.user) return;

    setIsSubmitting(true);
    try {
      const comment = await createCommentApi(postId, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch {
      toast.error("留言失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-border/50 px-4 pb-4">
      {/* Comments list */}
      <div className="space-y-3 py-3 max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <RiLoader2Line className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            還沒有留言，成為第一個留言的人吧！
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <Link href={`/${comment.author?.username}`}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage
                    src={comment.author?.avatar}
                    alt={comment.author?.nickname}
                  />
                  <AvatarFallback className="text-[10px]">
                    {comment.author?.nickname?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <Link
                    href={`/${comment.author?.username}`}
                    className="text-xs font-semibold hover:underline"
                  >
                    {comment.author?.nickname}
                  </Link>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                      locale: zhTW,
                    })}
                  </span>
                </div>
                <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Comment Input */}
      {session?.user && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage
              src={session.user.avatar}
              alt={session.user.nickname}
            />
            <AvatarFallback className="text-[10px]">
              {session.user.nickname?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Input
            placeholder="寫一則留言..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && handleSubmit()
            }
            className="h-8 text-xs flex-1"
            disabled={isSubmitting}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleSubmit}
            disabled={isSubmitting || !newComment.trim()}
          >
            {isSubmitting ? (
              <RiLoader2Line className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RiSendPlaneLine className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
