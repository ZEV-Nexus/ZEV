"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPosts } from "@/shared/service/api/post";
import type { Post } from "@/shared/types";
import CreatePostForm from "./create-post-form";
import PostCard from "./post-card";
import { Button } from "@/shared/shadcn/components/ui/button";
import { Skeleton } from "@/shared/shadcn/components/ui/skeleton";
import {
  RiLoader2Line,
  RiQuillPenLine,
  RiArrowDownLine,
} from "@remixicon/react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function FeedPage() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const t = useTranslations("feed");
  const tAuth = useTranslations("auth");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["feed-posts", page],
    queryFn: () => fetchPosts(page),
  });

  // Merge new page data into allPosts
  useEffect(() => {
    if (data?.posts) {
      if (page === 1) {
        setAllPosts(data.posts);
      } else {
        setAllPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = data.posts.filter(
            (p: Post) => !existingIds.has(p.id),
          );
          return [...prev, ...newPosts];
        });
      }
    }
  }, [data, page]);

  const handlePostCreated = useCallback(() => {
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
  }, [queryClient]);

  const handleDeleted = useCallback((postId: string) => {
    setAllPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const handleLikeToggled = useCallback(
    (postId: string, liked: boolean, count: number) => {
      setAllPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const currentUserId = session?.user?.id || "";
          return {
            ...p,
            likes: liked
              ? [...(p.likes || []), currentUserId]
              : (p.likes || []).filter((id) => id !== currentUserId),
            commentCount: p.commentCount,
          };
        }),
      );
    },
    [session?.user?.id],
  );

  const isAuthenticated = status === "authenticated";

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/3" />
        <div className="relative max-w-2xl mx-auto px-4 py-10 sm:py-14">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-base">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-5">
        {/* Create Post */}
        {isAuthenticated ? (
          <CreatePostForm onPostCreated={handlePostCreated} />
        ) : (
          <div className="rounded-xl border border-border/60 bg-card p-6 text-center shadow-sm">
            <RiQuillPenLine className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              {tAuth("loginToPost")}
            </p>
            <Button asChild>
              <Link href="/auth/login">{tAuth("login")}</Link>
            </Button>
          </div>
        )}

        {/* Posts Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 bg-card p-5 space-y-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : allPosts.length === 0 ? (
          <div className="text-center py-16">
            <RiQuillPenLine className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">{t("noPosts")}</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {allPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDeleted={() => handleDeleted(post.id)}
                  onLikeToggled={handleLikeToggled}
                />
              ))}
            </div>

            {/* Load More */}
            {data?.hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isFetching}
                  className="gap-2"
                >
                  {isFetching ? (
                    <RiLoader2Line className="h-4 w-4 animate-spin" />
                  ) : (
                    <RiArrowDownLine className="h-4 w-4" />
                  )}
                  {t("loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
