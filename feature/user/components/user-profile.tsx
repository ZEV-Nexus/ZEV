"use client";

import { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { Button } from "@/shared/shadcn/components/ui/button";
import { Input } from "@/shared/shadcn/components/ui/input";
import { Separator } from "@/shared/shadcn/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/shared/shadcn/components/ui/card";
import {
  RiEditLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader2Line,
  RiMailLine,
  RiCalendarLine,
  RiAtLine,
  RiChat1Line,
  RiLogoutBoxLine,
} from "@remixicon/react";
import { updateUsername } from "@/shared/service/api/user";
import { toast } from "sonner";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface UserProfileData {
  id: string;
  userId: string;
  username: string;
  nickname: string;
  email: string;
  bio: string;
  avatar: string;
  createdAt: string;
}

interface UserProfileProps {
  profile: UserProfileData;
  isOwnProfile: boolean;
  currentUserId?: string;
}

export default function UserProfile({
  profile,
  isOwnProfile,
}: UserProfileProps) {
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [username, setUsername] = useState(profile.username);
  const [editUsername, setEditUsername] = useState(profile.username);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveUsername = async () => {
    const trimmed = editUsername.trim().toLowerCase();
    if (trimmed === username) {
      setIsEditingUsername(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateUsername(trimmed);
      setUsername(trimmed);
      setIsEditingUsername(false);
      toast.success("Username 已更新");
    } catch (error: any) {
      toast.error(error?.message || "更新失敗");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditUsername(username);
    setIsEditingUsername(false);
  };

  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen flex-1 bg-background">
      {/* Hero section */}
      <div className="relative">
        <div className="h-48 bg-linear-to-br from-primary/30 via-primary/10 to-background" />
        <div className="max-w-2xl mx-auto px-6 -mt-16">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-32 w-32 ring-4 ring-background shadow-xl">
              {profile.avatar && (
                <AvatarImage src={profile.avatar} alt={profile.nickname} />
              )}
              <AvatarFallback className="text-4xl bg-primary text-primary-foreground font-bold">
                {profile.nickname?.[0] || profile.username?.[0] || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 pt-4 sm:pt-16">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {profile.nickname}
                </h1>
              </div>

              {/* Username display / edit */}
              <div className="flex items-center gap-2 mt-1">
                <RiAtLine className="h-4 w-4 text-muted-foreground shrink-0" />
                {isEditingUsername ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="h-7 text-sm w-48"
                      placeholder="username"
                      maxLength={30}
                      disabled={isSaving}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveUsername();
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleSaveUsername}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <RiLoader2Line className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RiCheckLine className="h-3.5 w-3.5 text-green-500" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      <RiCloseLine className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">
                      {username}
                    </span>
                    {isOwnProfile && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          setEditUsername(username);
                          setIsEditingUsername(true);
                        }}
                      >
                        <RiEditLine className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-2">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile info */}
      <div className="max-w-2xl mx-auto px-6 mt-8 pb-12">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">個人資訊</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <RiMailLine className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">電子郵件</p>
                <p className="text-sm">{profile.email}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <RiAtLine className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="text-sm">{username}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <RiCalendarLine className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">加入日期</p>
                <p className="text-sm">{joinDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {!isOwnProfile && (
          <div className="mt-6 flex gap-3">
            <Button className="flex-1">
              <RiChat1Line className="h-4 w-4 mr-2" />
              傳送訊息
            </Button>
          </div>
        )}

        {isOwnProfile && (
          <div className="mt-6 flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/c">
                <RiChat1Line className="h-4 w-4 mr-2" />
                回到聊天室
              </Link>
            </Button>
            <Button onClick={() => signOut()} variant="destructive">
              <RiLogoutBoxLine className="h-4 w-4 mr-2" />
              登出
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
