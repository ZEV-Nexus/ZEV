"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/shadcn/components/ui/dialog";
import { Button } from "@/shared/shadcn/components/ui/button";
import { Input } from "@/shared/shadcn/components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { ChatRoom } from "@/shared/types";
import { updateRoomInfo } from "@/shared/service/api/room";
import { uploadFileToCloudinary } from "@/shared/service/api/upload";
import { toast } from "sonner";
import { RiCameraLine, RiLoader2Line, RiCloseLine } from "@remixicon/react";

interface EditRoomInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: ChatRoom;
  onUpdated?: (updates: { name?: string; avatar?: string }) => void;
}

export default function EditRoomInfoDialog({
  open,
  onOpenChange,
  room,
  onUpdated,
}: EditRoomInfoDialogProps) {
  const [name, setName] = useState(room.name || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    room.avatar || null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("圖片不能超過 5MB");
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!room.roomId) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("群組名稱不能為空");
      return;
    }

    setIsSaving(true);
    try {
      let avatarUrl = room.avatar;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const uploaded = await uploadFileToCloudinary(avatarFile);
        avatarUrl = uploaded.url;
      } else if (avatarPreview === null && room.avatar) {
        // Avatar was removed
        avatarUrl = "";
      }

      const updates: { name?: string; avatar?: string } = {};

      if (trimmedName !== room.name) {
        updates.name = trimmedName;
      }
      if (avatarUrl !== room.avatar) {
        updates.avatar = avatarUrl;
      }

      if (Object.keys(updates).length === 0) {
        onOpenChange(false);
        return;
      }

      await updateRoomInfo(room.roomId, updates);
      onUpdated?.(updates);
      toast.success("群組資訊已更新");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "更新失敗");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(room.name || "");
      setAvatarPreview(room.avatar || null);
      setAvatarFile(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>編輯群組資訊</DialogTitle>
          <DialogDescription>更新群組名稱和頭像</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Avatar Upload */}
          <div className="relative group">
            <Avatar
              className="h-20 w-20 cursor-pointer"
              onClick={handleAvatarClick}
            >
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} alt="群組頭像" />
              ) : null}
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-semibold">
                {name?.[0] || room.name?.[0] || "G"}
              </AvatarFallback>
            </Avatar>

            {/* Camera overlay */}
            <button
              type="button"
              onClick={handleAvatarClick}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <RiCameraLine className="h-6 w-6 text-white" />
            </button>

            {/* Remove button */}
            {avatarPreview && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors cursor-pointer"
              >
                <RiCloseLine className="h-3 w-3" />
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <p className="text-xs text-muted-foreground">點擊頭像以上傳新圖片</p>

          {/* Name Input */}
          <div className="w-full space-y-2">
            <label
              htmlFor="room-name"
              className="text-sm font-medium text-foreground"
            >
              群組名稱
            </label>
            <Input
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="輸入群組名稱..."
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground text-right">
              {name.length}/50
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && (
              <RiLoader2Line className="mr-2 h-4 w-4 animate-spin" />
            )}
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
