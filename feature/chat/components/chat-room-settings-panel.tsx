"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/shadcn/components/ui/sheet";
import { Button } from "@/shared/shadcn/components/ui/button";
import { Switch } from "@/shared/shadcn/components/ui/switch";
import { Separator } from "@/shared/shadcn/components/ui/separator";
import { ScrollArea } from "@/shared/shadcn/components/ui/scroll-area";
import {
  Avatar,
  AvatarFallback,
  AvatarBadge,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/shadcn/components/ui/select";
import { ChatRoom, Member } from "@/shared/types";
import {
  updateRoomSettings,
  updateMemberRole,
} from "@/shared/service/api/room";
import { useChatStore } from "@/shared/store/chat-store";
import { toast } from "sonner";
import {
  RiNotificationLine,
  RiPushpinLine,
  RiImageLine,
  RiFileTextLine,
  RiLinksLine,
  RiShieldLine,
  RiLogoutBoxLine,
  RiEditLine,
  RiArrowRightSLine,
  RiVipCrownLine,
  RiUserLine,
  RiLoader2Line,
} from "@remixicon/react";
import InviteMemberDialog from "@/feature/chat/components/dialog/invite-member-dialog";
import MembersDialog from "@/feature/chat/components/dialog/members-dialog";
import EditRoomInfoDialog from "@/feature/chat/components/dialog/edit-room-info-dialog";
import {
  MemberRoleUpdatedPayload,
  RoomInfoUpdatedPayload,
} from "@/shared/hooks/use-ably-notification";
import { useOnlineStore } from "@/shared/store/online-store";

interface ChatRoomSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: ChatRoom;
  members: Member[];
  currentUserId: string;
}

export function ChatRoomSettingsPanel({
  open,
  onOpenChange,
  room,
  members,
  currentUserId,
}: ChatRoomSettingsPanelProps) {
  const currentUserMember = members.find(
    (m) => m.user.userId === currentUserId,
  );
  const currentUserRole = currentUserMember?.role || "member";
  const isGroup = room.roomType === "group";
  const canChangeRole =
    isGroup && (currentUserRole === "admin" || currentUserRole === "owner");

  const [notificationEnabled, setNotificationEnabled] = useState(
    currentUserMember?.notificationSetting !== "mute",
  );
  const [pinned, setPinned] = useState(currentUserMember?.pinned || false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [localMembers, setLocalMembers] = useState<Member[]>(members);
  const [localRoom, setLocalRoom] = useState<ChatRoom>(room);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const { onlineUsers } = useOnlineStore();

  // Sync with prop changes
  useEffect(() => {
    setLocalMembers(members);
  }, [members]);

  useEffect(() => {
    setLocalRoom(room);
  }, [room]);

  // Listen for real-time role updates
  useEffect(() => {
    const handleRoleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<MemberRoleUpdatedPayload>).detail;
      if (detail.roomId === room.roomId) {
        setLocalMembers((prev) =>
          prev.map((m) =>
            m.id === detail.memberId ? { ...m, role: detail.newRole } : m,
          ),
        );
      }
    };

    const handleRoomInfoUpdate = (event: Event) => {
      const detail = (event as CustomEvent<RoomInfoUpdatedPayload>).detail;
      if (detail.roomId === room.roomId) {
        setLocalRoom((prev) => ({
          ...prev,
          ...(detail.name !== undefined && { name: detail.name }),
          ...(detail.avatar !== undefined && { avatar: detail.avatar }),
        }));
      }
    };

    window.addEventListener("member-role-updated", handleRoleUpdate);
    window.addEventListener("room-info-updated", handleRoomInfoUpdate);
    return () => {
      window.removeEventListener("member-role-updated", handleRoleUpdate);
      window.removeEventListener("room-info-updated", handleRoomInfoUpdate);
    };
  }, [room.roomId]);

  const handleRoleChange = useCallback(
    async (
      memberId: string,
      newRole: "admin" | "owner" | "member" | "guest",
    ) => {
      if (!room.roomId) return;
      setUpdatingMemberId(memberId);

      // Optimistic update
      setLocalMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
      );

      try {
        await updateMemberRole(room.roomId, memberId, newRole);
        toast.success("角色已更新");
      } catch (error: any) {
        // Revert on failure
        setLocalMembers(members);
        toast.error(error?.message || "更新角色失敗");
      } finally {
        setUpdatingMemberId(null);
      }
    },
    [room.roomId, members],
  );

  const handleRoomInfoUpdated = useCallback(
    (updates: { name?: string; avatar?: string }) => {
      setLocalRoom((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const recipient = members?.find(
    (member) => member.user.userId !== currentUserId,
  );

  const displayName =
    room.roomType === "dm" ? recipient?.user.nickname : localRoom.name;
  const displayAvatar =
    room.roomType === "dm"
      ? recipient?.user.nickname?.charAt(0)
      : localRoom.name?.charAt(0);
  const displayAvatarUrl =
    room.roomType === "dm" ? recipient?.user.avatar : localRoom.avatar;

  const handleNotificationToggle = async (checked: boolean) => {
    if (!room.roomId) return;
    setNotificationEnabled(checked);
    useChatStore.getState().updateRoomSettings(room.roomId, currentUserId, {
      notificationSetting: checked ? "all" : "mute",
    });
    try {
      await updateRoomSettings(room.roomId, {
        notificationSetting: checked ? "all" : "mute",
      });
    } catch (error) {
      console.error(error);
      setNotificationEnabled(!checked);
      useChatStore.getState().updateRoomSettings(room.roomId, currentUserId, {
        notificationSetting: !checked ? "all" : "mute",
      });
      toast.error("Failed to update notification settings");
    }
  };

  const handlePinnedToggle = async (checked: boolean) => {
    if (!room.id) return;
    setPinned(checked);
    useChatStore
      .getState()
      .updateRoomSettings(room.id, currentUserId, { pinned: checked });
    try {
      await updateRoomSettings(room.id, {
        pinned: checked,
      });
    } catch (error) {
      console.error(error);
      setPinned(!checked);
      useChatStore.getState().updateRoomSettings(room.id, currentUserId, {
        pinned: !checked,
      });
      toast.error("Failed to update pinned status");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-sm p-0 flex flex-col overflow-auto"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>聊天室設定</SheetTitle>
          <SheetDescription>管理聊天室相關設定</SheetDescription>
        </SheetHeader>

        <ScrollArea>
          <div className="flex flex-col">
            <div className="flex flex-col items-center py-6 px-4">
              <Avatar className="h-16 w-16 mb-3">
                <AvatarBadge className="bg-green-500 h-3 w-3 ring-2 ring-background" />
                {displayAvatarUrl && (
                  <AvatarImage src={displayAvatarUrl} alt={displayName || ""} />
                )}
                <AvatarFallback className="text-xl bg-primary text-primary-foreground font-semibold">
                  {displayAvatar}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold">{displayName}</h3>
              <p className="text-sm text-muted-foreground">
                {room.roomType === "dm"
                  ? "私人對話"
                  : `${members.length} 位成員`}
              </p>
              {room.roomType !== "dm" && canChangeRole && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs text-muted-foreground"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <RiEditLine className="h-3.5 w-3.5 mr-1" />
                  編輯資訊
                </Button>
              )}

              {/* Edit Room Info Dialog */}
              <EditRoomInfoDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                room={localRoom}
                onUpdated={handleRoomInfoUpdated}
              />
            </div>

            <Separator />

            {/* Quick Settings */}
            <div className="px-4 py-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                快速設定
              </h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <RiNotificationLine className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">通知</span>
                  </div>
                  <Switch
                    checked={notificationEnabled}
                    onCheckedChange={handleNotificationToggle}
                  />
                </div>
                <div className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <RiPushpinLine className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">釘選對話</span>
                  </div>
                  <Switch
                    checked={pinned}
                    onCheckedChange={handlePinnedToggle}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Members */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  成員 ({members.length})
                </h4>
                {room.roomType !== "dm" && (
                  <InviteMemberDialog
                    roomId={room.roomId || ""}
                    existingMembers={members}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      邀請
                    </Button>
                  </InviteMemberDialog>
                )}
              </div>
              <div className="space-y-0.5">
                {localMembers.slice(0, 5).map((member) => {
                  const isCurrentUser = member.user.userId === currentUserId;
                  const isOnline = onlineUsers.has(member.user.userId);
                  const isUpdating = updatingMemberId === member.id;
                  const canChangeThisMember =
                    canChangeRole &&
                    !isCurrentUser &&
                    !(currentUserRole === "admin" && member.role === "owner");

                  const roleLabel =
                    member.role === "owner"
                      ? "擁有者"
                      : member.role === "admin"
                        ? "管理員"
                        : member.role === "guest"
                          ? "訪客"
                          : "成員";

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 w-full py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        {isOnline && (
                          <AvatarBadge className="bg-green-500 h-2 w-2 ring-2 ring-background" />
                        )}
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {member.user.nickname?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.user.nickname}
                          {isCurrentUser && (
                            <span className="text-muted-foreground font-normal ml-1">
                              (你)
                            </span>
                          )}
                        </p>
                        {!canChangeThisMember && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {member.role === "owner" && (
                              <RiVipCrownLine className="h-3 w-3 text-amber-500" />
                            )}
                            {member.role === "admin" && (
                              <RiShieldLine className="h-3 w-3 text-blue-500" />
                            )}
                            {roleLabel}
                          </p>
                        )}
                      </div>
                      {canChangeThisMember && (
                        <div className="shrink-0">
                          {isUpdating ? (
                            <RiLoader2Line className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Select
                              value={member.role}
                              onValueChange={(value) =>
                                handleRoleChange(
                                  member.id,
                                  value as
                                    | "admin"
                                    | "owner"
                                    | "member"
                                    | "guest",
                                )
                              }
                            >
                              <SelectTrigger
                                size="sm"
                                className="h-6 text-[11px] min-w-[80px]"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {currentUserRole === "owner" && (
                                  <SelectItem value="owner">
                                    <RiVipCrownLine className="h-3 w-3 text-amber-500" />
                                    擁有者
                                  </SelectItem>
                                )}
                                <SelectItem value="admin">
                                  <RiShieldLine className="h-3 w-3 text-blue-500" />
                                  管理員
                                </SelectItem>
                                <SelectItem value="member">
                                  <RiUserLine className="h-3 w-3" />
                                  成員
                                </SelectItem>
                                <SelectItem value="guest">
                                  <RiUserLine className="h-3 w-3" />
                                  訪客
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {localMembers.length > 5 && (
                  <button
                    onClick={() => setMembersDialogOpen(true)}
                    className="flex items-center justify-center gap-1 w-full py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors text-sm text-muted-foreground cursor-pointer"
                  >
                    查看全部 {localMembers.length} 位成員
                    <RiArrowRightSLine className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Members Dialog */}
              <MembersDialog
                open={membersDialogOpen}
                onOpenChange={setMembersDialogOpen}
                members={localMembers}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                roomId={room.roomId || ""}
                isGroup={isGroup}
              />
            </div>

            <Separator />

            {/* Shared Media */}
            <div className="px-4 py-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                共享內容
              </h4>
              <div className="space-y-0.5">
                <button className="flex items-center justify-between w-full py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <RiImageLine className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">圖片與影片</span>
                  </div>
                  <RiArrowRightSLine className="h-4 w-4 text-muted-foreground" />
                </button>
                <button className="flex items-center justify-between w-full py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <RiFileTextLine className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">檔案</span>
                  </div>
                  <RiArrowRightSLine className="h-4 w-4 text-muted-foreground" />
                </button>
                <button className="flex items-center justify-between w-full py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <RiLinksLine className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">連結</span>
                  </div>
                  <RiArrowRightSLine className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <Separator />

            {/* Privacy & Danger Zone */}
            <div className="px-4 py-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                隱私與安全
              </h4>
              <div className="space-y-0.5">
                <button className="flex items-center justify-between w-full py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <RiShieldLine className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">隱私設定</span>
                  </div>
                  <RiArrowRightSLine className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <Separator />

            {/* Leave */}
            <div className="px-4 py-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <RiLogoutBoxLine className="h-4 w-4 mr-3" />
                {room.roomType === "dm" ? "刪除對話" : "離開聊天室"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
