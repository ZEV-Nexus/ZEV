"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/shadcn/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/shadcn/components/ui/select";
import {
  Avatar,
  AvatarFallback,
  AvatarBadge,
} from "@/shared/shadcn/components/ui/avatar";
import { ScrollArea } from "@/shared/shadcn/components/ui/scroll-area";
import { Badge } from "@/shared/shadcn/components/ui/badge";
import { Member } from "@/shared/types";
import { updateMemberRole } from "@/shared/service/api/room";
import { toast } from "sonner";
import { useOnlineStore } from "@/shared/store/online-store";
import { MemberRoleUpdatedPayload } from "@/shared/hooks/use-ably-notification";
import {
  RiShieldLine,
  RiVipCrownLine,
  RiUserLine,
  RiLoader2Line,
} from "@remixicon/react";

const ROLE_CONFIG = {
  owner: {
    label: "擁有者",
    icon: RiVipCrownLine,
    color: "text-amber-500",
    badgeVariant: "default" as const,
  },
  admin: {
    label: "管理員",
    icon: RiShieldLine,
    color: "text-blue-500",
    badgeVariant: "secondary" as const,
  },
  member: {
    label: "成員",
    icon: RiUserLine,
    color: "text-muted-foreground",
    badgeVariant: "outline" as const,
  },
  guest: {
    label: "訪客",
    icon: RiUserLine,
    color: "text-muted-foreground",
    badgeVariant: "outline" as const,
  },
};

interface MembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  currentUserId: string;
  currentUserRole: "admin" | "owner" | "member" | "guest";
  roomId: string;
  isGroup: boolean;
}

export default function MembersDialog({
  open,
  onOpenChange,
  members: initialMembers,
  currentUserId,
  currentUserRole,
  roomId,
  isGroup,
}: MembersDialogProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const { onlineUsers } = useOnlineStore();

  const canChangeRole =
    isGroup && (currentUserRole === "admin" || currentUserRole === "owner");

  // Sync with prop changes
  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  // Listen for real-time role updates
  useEffect(() => {
    const handleRoleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<MemberRoleUpdatedPayload>).detail;
      if (detail.roomId === roomId) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === detail.memberId ? { ...m, role: detail.newRole } : m,
          ),
        );
      }
    };

    window.addEventListener("member-role-updated", handleRoleUpdate);
    return () =>
      window.removeEventListener("member-role-updated", handleRoleUpdate);
  }, [roomId]);

  const handleRoleChange = useCallback(
    async (
      memberId: string,
      newRole: "admin" | "owner" | "member" | "guest",
    ) => {
      setUpdatingMemberId(memberId);

      // Optimistic update
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
      );

      try {
        await updateMemberRole(roomId, memberId, newRole);
        toast.success("角色已更新");
      } catch (error: any) {
        // Revert on failure
        setMembers(initialMembers);
        toast.error(error?.message || "更新角色失敗");
      } finally {
        setUpdatingMemberId(null);
      }
    },
    [roomId, initialMembers],
  );

  // Sort members: owner first, then admin, then member, then guest
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2, guest: 3 };
    return (roleOrder[a.role] || 3) - (roleOrder[b.role] || 3);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>全部成員 ({members.length})</DialogTitle>
          <DialogDescription>
            查看聊天室中的所有成員
            {canChangeRole && "，你可以更改成員的角色"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-1">
            {sortedMembers.map((member) => {
              const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
              const RoleIcon = roleConfig.icon;
              const isCurrentUser = member.user.userId === currentUserId;
              const isOnline = onlineUsers.has(member.user.userId);
              const isUpdating = updatingMemberId === member.id;

              // Can the current user change this member's role?
              const canChangeThisMember =
                canChangeRole &&
                !isCurrentUser &&
                // Admin cannot change owner's role
                !(currentUserRole === "admin" && member.role === "owner");

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 w-full py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    {isOnline && (
                      <AvatarBadge className="bg-green-500 h-2.5 w-2.5 ring-2 ring-background" />
                    )}
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {member.user.nickname?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {member.user.nickname}
                        {isCurrentUser && (
                          <span className="text-muted-foreground font-normal ml-1">
                            (你)
                          </span>
                        )}
                      </p>
                      {!canChangeThisMember && (
                        <Badge
                          variant={roleConfig.badgeVariant}
                          className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                        >
                          <RoleIcon
                            className={`h-2.5 w-2.5 mr-0.5 ${roleConfig.color}`}
                          />
                          {roleConfig.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.user.email || (isOnline ? "在線上" : "離線")}
                    </p>
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
                              value as "admin" | "owner" | "member" | "guest",
                            )
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            className="h-7 text-xs min-w-[90px]"
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
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
