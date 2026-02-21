"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "@remixicon/react";
import { useSession } from "next-auth/react";
import { createPost, searchGitHubRepos } from "@/shared/service/api/post";
import { uploadFileToCloudinary } from "@/shared/service/api/upload";
import { toast } from "sonner";
import type { GitHubRepo } from "@/shared/types";
import { Input } from "@/shared/shadcn/components/ui/input";
import Image from "next/image";

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
  const [githubResults, setGithubResults] = useState<
    (GitHubRepo & { fullName: string; avatar: string })[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GitHub connection state
  const [showGithubConnect, setShowGithubConnect] = useState(false);

  const hasGithubConnected = !!session?.user?.githubUsername;

  // Listen for message from the GitHub OAuth popup
  const handleGithubMessage = useCallback(
    async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "github-connect") return;

      if (event.data.success) {
        toast.success(event.data.message || "GitHub 帳號連結成功！");
        setShowGithubConnect(false);
        // Refresh session to get updated githubUsername
        await updateSession();
      } else {
        toast.error(event.data.message || "GitHub 帳號連結失敗");
      }
    },
    [updateSession],
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
      "/api/github/connect",
      "github-connect",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );
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
    } catch (error) {
      toast.error("圖片上傳失敗");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSearchGithub = async () => {
    if (!githubQuery.trim()) return;
    setIsSearching(true);
    try {
      const repos = await searchGitHubRepos(githubQuery.trim());
      if (repos.message) {
        toast.error(repos.message);
        return;
      }
      if (repos?.data.length === 0) {
        toast.error("找不到相關專案");
        return;
      }
      setGithubResults(repos.data);
    } catch {
      toast.error("搜尋 GitHub 失敗");
    } finally {
      setIsSearching(false);
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
      toast.success("貼文發布成功！");
    } catch {
      toast.error("貼文發布失敗");
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

          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="分享一些想法..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none border-none bg-transparent p-0 text-sm focus-visible:ring-0 placeholder:text-muted-foreground/60"
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
                  <span className="font-medium">連結 GitHub 帳號</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  你尚未連結 GitHub 帳號，請透過 GitHub
                  登入來連結帳號，連結後即可搜尋並分享你的專案。
                </p>
                <Button
                  size="sm"
                  onClick={handleConnectGithub}
                  className="gap-2 w-full"
                >
                  <RiGithubLine className="h-4 w-4" />
                  使用 GitHub 連結帳號
                </Button>
              </div>
            )}

            {/* GitHub Search Panel — shown when user has a connected GitHub account */}
            {showGithubSearch && !selectedRepo && hasGithubConnected && (
              <div className="rounded-lg border border-border overflow-auto max-h-60  bg-muted/20 p-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="搜尋 GitHub 專案..."
                    value={githubQuery}
                    onChange={(e) => setGithubQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchGithub()}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleSearchGithub}
                    disabled={isSearching}
                    className="shrink-0"
                  >
                    {isSearching ? (
                      <RiLoader2Line className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "搜尋"
                    )}
                  </Button>
                </div>
                {githubResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {githubResults.map((repo) => (
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
                          setGithubResults([]);
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
                            ⭐ {repo.stars} · {repo.language}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
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
                  圖片
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
                        setGithubResults([]);
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
                發布
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
