"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { Button } from "@/shared/shadcn/components/ui/button";
import { Textarea } from "@/shared/shadcn/components/ui/textarea";
import { Card, CardContent } from "@/shared/shadcn/components/ui/card";
import {
  RiImageAddLine,
  RiGithubLine,
  RiCloseLine,
  RiLoader2Line,
  RiSendPlaneLine,
  RiLinkUnlink,
  RiStarSLine,
} from "@remixicon/react";
import { useSession } from "next-auth/react";
import {
  createPost,
  fetchGitHubRepos,
  disconnectGitHub,
} from "@/shared/service/api/post";
import { uploadFileToCloudinary } from "@/shared/service/api/upload";
import { toast } from "sonner";
import type { GitHubRepo } from "@/shared/types";
import { Input } from "@/shared/shadcn/components/ui/input";
import Image from "next/image";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

interface CreatePostFormProps {
  onPostCreated: () => void;
}

export default function CreatePostForm({ onPostCreated }: CreatePostFormProps) {
  const { data: session, update: updateSession } = useSession();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [showGithubSearch, setShowGithubSearch] = useState(false);
  const [githubQuery, setGithubQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GitHub connection state
  const [showGithubConnect, setShowGithubConnect] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const t = useTranslations("feed");

  const hasGithubConnected = !!session?.user?.githubUsername;

  // Fetch all GitHub repos with infinite pagination (30 per page)
  const {
    data: repoPages,
    isLoading: isLoadingRepos,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["github-repos", session?.user?.githubUsername],
    queryFn: async ({ pageParam }) => {
      const res = await fetchGitHubRepos(String(pageParam));
      if (res.message) {
        toast.error(res.message);
        return [];
      }
      return res.data ?? [];
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      // GitHub returns 30 per page by default; if less, no more pages
      if (lastPage.length < 30) return undefined;
      return lastPageParam + 1;
    },
    enabled: showGithubSearch && hasGithubConnected,
  });

  // Flatten all pages into a single list
  const allRepos = useMemo(() => repoPages?.pages.flat() ?? [], [repoPages]);

  // Client-side filter by search query
  const filteredRepos = useMemo(() => {
    const q = githubQuery.trim().toLowerCase();
    if (!q) return allRepos;
    return allRepos.filter(
      (repo) =>
        repo.fullName?.toLowerCase().includes(q) ||
        repo.repo?.toLowerCase().includes(q) ||
        repo.description?.toLowerCase().includes(q) ||
        repo.language?.toLowerCase().includes(q),
    );
  }, [allRepos, githubQuery]);

  // Listen for message from the GitHub OAuth popup
  const handleGithubMessage = useCallback(
    async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "github-connect") return;

      if (event.data.success) {
        toast.success(event.data.message || t("githubConnected"));
        setShowGithubConnect(false);
        // Refresh session to get updated githubUsername
        await updateSession();
      } else {
        toast.error(event.data.message || t("githubConnectFailed"));
      }
    },
    [updateSession, t],
  );

  useEffect(() => {
    window.addEventListener("message", handleGithubMessage);
    return () => window.removeEventListener("message", handleGithubMessage);
  }, [handleGithubMessage]);

  const handleConnectGithub = () => {
    // Open GitHub OAuth in a popup window (does NOT affect current session)
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(
      "/api/third-part/oauth/github",
      "github-connect",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );
  };

  const handleDisconnectGithub = async () => {
    setIsDisconnecting(true);
    try {
      const res = await disconnectGitHub();
      if (res.ok) {
        toast.success(t("githubDisconnected"));
        setSelectedRepo(null);
        setShowGithubSearch(false);
        setGithubQuery("");
        await updateSession();
      } else {
        toast.error(res.error || t("githubDisconnectFailed"));
      }
    } catch {
      toast.error(t("githubDisconnectError"));
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map((file) =>
        uploadFileToCloudinary(file),
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map((r) => r.url).filter(Boolean) as string[];
      setImages((prev) => [...prev, ...urls]);
    } catch {
      toast.error(t("imageUploadFailed"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return;

    setIsSubmitting(true);
    try {
      await createPost({
        content: content.trim(),
        images: images.length > 0 ? images : undefined,
        githubRepo: selectedRepo || undefined,
      });
      setContent("");
      setImages([]);
      setSelectedRepo(null);
      setShowGithubSearch(false);
      onPostCreated();
      toast.success(t("postSuccess"));
    } catch {
      toast.error(t("postFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session?.user) return null;

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="pt-5">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage
              src={session.user.avatar}
              alt={session.user.nickname}
            />
            <AvatarFallback>
              {session.user.nickname?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3 ">
            <Textarea
              placeholder={t("sharePlaceholder")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-20 p-1 resize-none border-none bg-transparent!  text-sm focus-visible:ring-0 placeholder:text-muted-foreground/60"
            />

            {/* Image Previews */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <div
                    key={i}
                    className="relative group h-20 w-20 rounded-lg overflow-hidden border border-border"
                  >
                    <Image src={url} alt="" fill className="object-cover" />
                    <button
                      onClick={() =>
                        setImages((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <RiCloseLine className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Selected GitHub Repo Preview */}
            {selectedRepo && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5 text-sm">
                <RiGithubLine className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {selectedRepo.owner}/{selectedRepo.repo}
                  </p>
                  {selectedRepo.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedRepo.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedRepo(null)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <RiCloseLine className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* GitHub Connect Panel — shown when user has no GitHub account linked */}
            {showGithubConnect && !hasGithubConnected && (
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <RiGithubLine className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t("githubConnect")}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("githubNotConnected")}
                </p>
                <Button
                  size="sm"
                  onClick={handleConnectGithub}
                  className="gap-2 w-full"
                >
                  <RiGithubLine className="h-4 w-4" />
                  {t("githubConnectButton")}
                </Button>
              </div>
            )}

            {/* GitHub Search Panel — shown when user has a connected GitHub account */}
            {showGithubSearch && !selectedRepo && hasGithubConnected && (
              <div className="rounded-lg border border-border overflow-auto max-h-72 bg-muted/20 p-3 space-y-2">
                {/* Connected account info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RiGithubLine className="h-3.5 w-3.5" />
                    <span>
                      已連結：
                      <span className="font-medium text-foreground">
                        {session?.user?.githubUsername}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[10px] text-destructive hover:text-destructive gap-1"
                      onClick={handleDisconnectGithub}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting ? (
                        <RiLoader2Line className="h-3 w-3 animate-spin" />
                      ) : (
                        <RiLinkUnlink className="h-3 w-3" />
                      )}
                      {t("disconnect")}
                    </Button>
                  </div>
                </div>

                {/* Search input — client-side filter */}
                <div className="relative">
                  <Input
                    placeholder={t("filterProjects")}
                    value={githubQuery}
                    onChange={(e) => setGithubQuery(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Loading state */}
                {isLoadingRepos && (
                  <div className="flex items-center justify-center py-4">
                    <RiLoader2Line className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Results */}
                {!isLoadingRepos && filteredRepos.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredRepos.map((repo) => (
                      <button
                        key={repo.url}
                        onClick={() => {
                          setSelectedRepo({
                            owner: repo.owner,
                            repo: repo.repo,
                            url: repo.url,
                            description: repo.description,
                            stars: repo.stars,
                            language: repo.language,
                            forks: repo.forks,
                          });
                          setShowGithubSearch(false);
                          setGithubQuery("");
                        }}
                        className="flex items-center gap-2.5 w-full text-left rounded-md p-2 hover:bg-accent transition-colors"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={repo.avatar} alt={repo.owner} />
                          <AvatarFallback>{repo.owner[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {repo.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            <RiStarSLine
                              className="inline-block mr-1"
                              size={15}
                            />
                            {repo.stars} · {repo.language}
                          </p>
                        </div>
                      </button>
                    ))}

                    {/* Load more button — only show when not filtering */}
                    {!githubQuery.trim() && hasNextPage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? (
                          <RiLoader2Line className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        {t("loadMore")}
                      </Button>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {!isLoadingRepos &&
                  filteredRepos.length === 0 &&
                  allRepos.length > 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {t("noProjectsFound")}
                    </p>
                  )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-border/50 pt-3">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <RiLoader2Line className="h-4 w-4 animate-spin" />
                  ) : (
                    <RiImageAddLine className="h-4 w-4" />
                  )}
                  {t("image")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-1.5 ${
                    showGithubSearch || showGithubConnect
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => {
                    if (hasGithubConnected) {
                      // User has GitHub connected — toggle repo search
                      setShowGithubSearch(!showGithubSearch);
                      setShowGithubConnect(false);
                      if (showGithubSearch) {
                        setGithubQuery("");
                      }
                    } else {
                      // User has no GitHub — toggle connect panel
                      setShowGithubConnect(!showGithubConnect);
                      setShowGithubSearch(false);
                    }
                  }}
                >
                  <RiGithubLine className="h-4 w-4" />
                  GitHub
                </Button>
              </div>

              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={
                  isSubmitting || (!content.trim() && images.length === 0)
                }
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <RiLoader2Line className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RiSendPlaneLine className="h-3.5 w-3.5" />
                )}
                {t("publish")}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
