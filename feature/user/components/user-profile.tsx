"use client";

import { useState, useRef } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { Button } from "@/shared/shadcn/components/ui/button";
import { Input } from "@/shared/shadcn/components/ui/input";
import { Textarea } from "@/shared/shadcn/components/ui/textarea";
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
  RiCameraLine,
  RiPencilLine,
} from "@remixicon/react";
import { updateUsername, updateProfile } from "@/shared/service/api/user";
import { findOrCreateDM } from "@/shared/service/api/room";
import { uploadFileToCloudinary } from "@/shared/service/api/upload";
import { toast } from "sonner";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useLocaleStore } from "@/shared/store/locale-store";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/shared/store/chat-store";

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
  const { data: session } = useSession();
  const router = useRouter();
  const { addChatRoom } = useChatStore();
  const t = useTranslations("user");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const { locale } = useLocaleStore();

  // Editable states
  const [username, setUsername] = useState(profile.username);
  const [nickname, setNickname] = useState(profile.nickname);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);

  // Edit modes
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editUsername, setEditUsername] = useState(profile.username);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editNickname, setEditNickname] = useState(profile.nickname);
  const [editBio, setEditBio] = useState(profile.bio);

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Username mutation
  const { isPending: isUsernamePending, mutate: mutateUsername } = useMutation({
    mutationFn: async () => {
      const trimmed = editUsername.trim().toLowerCase();
      if (trimmed === username) {
        setIsEditingUsername(false);
        throw new Error("Username is unchanged");
      }
      const result = await updateUsername(editUsername);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess(data: { username: string }) {
      setUsername(data.username);
      setIsEditingUsername(false);
      toast.success(t("usernameUpdated"));
    },
    onError(error: unknown) {
      toast.error((error as Error)?.message || t("updateFailed"));
    },
  });

  // Profile mutation (nickname + bio)
  const { isPending: isProfilePending, mutate: mutateProfile } = useMutation({
    mutationFn: async () => {
      const trimmedNickname = editNickname.trim();
      const trimmedBio = editBio.trim();

      if (trimmedNickname === nickname && trimmedBio === bio) {
        setIsEditingProfile(false);
        throw new Error("No changes");
      }

      const updates: { nickname?: string; bio?: string } = {};
      if (trimmedNickname !== nickname) updates.nickname = trimmedNickname;
      if (trimmedBio !== bio) updates.bio = trimmedBio;

      const result = await updateProfile(updates);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess(data) {
      if (data.nickname) setNickname(data.nickname);
      if (data.bio !== undefined) setBio(data.bio);
      setIsEditingProfile(false);
      toast.success(t("profileUpdated"));
    },
    onError(error: unknown) {
      const msg = (error as Error)?.message;
      if (msg !== "No changes") {
        toast.error(msg || t("updateFailed"));
      }
    },
  });

  // Avatar upload handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("selectImage"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("imageTooLarge"));
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const uploaded = await uploadFileToCloudinary(file);
      if (!uploaded.url) throw new Error("No URL returned");

      const result = await updateProfile({ avatar: uploaded.url });
      if (result.error) throw new Error(result.error);

      setAvatar(uploaded.url);
      toast.success(t("avatarUpdated"));
    } catch {
      toast.error(t("avatarUploadFailed"));
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // Send message / create DM mutation
  const { isPending: isDMPending, mutate: mutateDM } = useMutation({
    mutationFn: async () => {
      const result = await findOrCreateDM(profile.id, {
        userId: profile.userId,
        nickname: profile.nickname,
        avatar: profile.avatar,
        email: profile.email,
      });
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess(data) {
      if (!data.isExisting) {
        addChatRoom(data.room, data.members);
      }
      router.push(`/c/${data.room.id}`);
    },
    onError(error: unknown) {
      toast.error((error as Error)?.message || t("updateFailed"));
    },
  });

  const handleCancelUsername = () => {
    setEditUsername(username);
    setIsEditingUsername(false);
  };

  const handleCancelProfile = () => {
    setEditNickname(nickname);
    setEditBio(bio);
    setIsEditingProfile(false);
  };

  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(
        locale === "zh-TW" ? "zh-TW" : "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      )
    : "";

  return (
    <div className="min-h-screen flex-1 bg-background">
      {/* Hero section */}
      <div className="relative">
        <div className="h-48 bg-linear-to-br from-primary/30 via-primary/10 to-background" />
        <div className="max-w-2xl mx-auto px-6 -mt-16">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar with upload */}
            <div className="relative group">
              <Avatar className="h-32 w-32 ring-4 ring-background shadow-xl">
                {avatar && <AvatarImage src={avatar} alt={nickname} />}
                <AvatarFallback className="text-4xl bg-primary text-primary-foreground font-bold">
                  {nickname?.[0] || username?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {isUploadingAvatar ? (
                      <RiLoader2Line className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <RiCameraLine className="h-6 w-6 text-white" />
                    )}
                  </button>
                </>
              )}
            </div>

            <div className="flex-1 pt-4 sm:pt-16">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {nickname}
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
                      disabled={isUsernamePending}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") mutateUsername();
                        if (e.key === "Escape") handleCancelUsername();
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => mutateUsername()}
                      disabled={isUsernamePending}
                    >
                      {isUsernamePending ? (
                        <RiLoader2Line className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RiCheckLine className="h-3.5 w-3.5 text-green-500" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleCancelUsername}
                      disabled={isUsernamePending}
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

              {/* Bio */}
              <p className="text-sm text-muted-foreground mt-2">
                {bio || (!isOwnProfile ? "" : t("noBio"))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile info */}
      <div className="max-w-2xl mx-auto px-6 mt-8 pb-12">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg font-semibold">{t("personalInfo")}</h2>
            {isOwnProfile && !isEditingProfile && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setEditNickname(nickname);
                  setEditBio(bio);
                  setIsEditingProfile(true);
                }}
              >
                <RiPencilLine className="h-3.5 w-3.5" />
                {t("editProfile")}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nickname */}
            <div className="flex items-center gap-3">
              <RiEditLine className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{t("nickname")}</p>
                {isEditingProfile ? (
                  <Input
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    placeholder={t("nicknamePlaceholder")}
                    className="h-8 text-sm mt-1"
                    maxLength={50}
                  />
                ) : (
                  <p className="text-sm">{nickname}</p>
                )}
              </div>
            </div>
            <Separator />
            {/* Bio */}
            <div className="flex items-start gap-3">
              <RiPencilLine className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{t("bio")}</p>
                {isEditingProfile ? (
                  <Textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder={t("bioPlaceholder")}
                    className="text-sm mt-1 min-h-20 resize-none"
                    maxLength={200}
                  />
                ) : (
                  <p className="text-sm">
                    {bio || (
                      <span className="text-muted-foreground italic">
                        {t("noBio")}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <Separator />
            {/* Email */}
            <div className="flex items-center gap-3">
              <RiMailLine className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("emailLabel")}
                </p>
                <p className="text-sm">{profile.email}</p>
              </div>
            </div>
            <Separator />
            {/* Username */}
            <div className="flex items-center gap-3">
              <RiAtLine className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="text-sm">{username}</p>
              </div>
            </div>
            <Separator />
            {/* Join date */}
            <div className="flex items-center gap-3">
              <RiCalendarLine className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{t("joinDate")}</p>
                <p className="text-sm">{joinDate}</p>
              </div>
            </div>

            {/* Save / Cancel for profile editing */}
            {isEditingProfile && (
              <>
                <Separator />
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelProfile}
                    disabled={isProfilePending}
                  >
                    <RiCloseLine className="h-3.5 w-3.5 mr-1" />
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => mutateProfile()}
                    disabled={isProfilePending}
                  >
                    {isProfilePending ? (
                      <RiLoader2Line className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <RiCheckLine className="h-3.5 w-3.5 mr-1" />
                    )}
                    {isProfilePending ? t("saving") : tCommon("save")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {!isOwnProfile && session?.user && (
          <div className="mt-6 flex gap-3">
            <Button
              className="flex-1"
              onClick={() => mutateDM()}
              disabled={isDMPending}
            >
              {isDMPending ? (
                <RiLoader2Line className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RiChat1Line className="h-4 w-4 mr-2" />
              )}
              {isDMPending ? t("creatingChat") : t("sendMessage")}
            </Button>
          </div>
        )}

        {isOwnProfile && (
          <div className="mt-6 flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/c">
                <RiChat1Line className="h-4 w-4 mr-2" />
                {t("backToChat")}
              </Link>
            </Button>
            <Button onClick={() => signOut()} variant="destructive">
              <RiLogoutBoxLine className="h-4 w-4 mr-2" />
              {tAuth("logout")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
