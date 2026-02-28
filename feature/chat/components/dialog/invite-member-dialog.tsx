"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/shared/shadcn/components/ui/dialog";
import { Button } from "@/shared/shadcn/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/shadcn/components/ui/table";
import { Checkbox } from "@/shared/shadcn/components/ui/checkbox";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { ScrollArea } from "@/shared/shadcn/components/ui/scroll-area";
import { RiLoader2Line, RiSearch2Line } from "@remixicon/react";
import { Member, User } from "@/shared/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/shared/service/api/fetch";
import { inviteMembers } from "@/shared/service/api/room";
import { toast } from "sonner";
import { Skeleton } from "@/shared/shadcn/components/ui/skeleton";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/shadcn/components/ui/input-group";
import { useTranslations } from "next-intl";

export default function InviteMemberDialog({
  roomId,
  existingMembers,
  children,
}: {
  roomId: string;
  existingMembers: Member[];
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const t = useTranslations("chatDialog");

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["users", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const response = await fetchApi<User[]>(`users/search?q=${query}`);
      return response.data;
    },
    enabled: query.length > 0,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await inviteMembers(roomId, selectedUserIds);
    },
    onSuccess: () => {
      toast.success("Members invited successfully");
      queryClient.invalidateQueries({ queryKey: ["room-members", roomId] });
      setOpen(false);
      setSelectedUserIds([]);
      setQuery("");
    },
    onError: () => {
      toast.error("Failed to invite members");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inviteTitle")}</DialogTitle>
          <DialogDescription>{t("inviteDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <InputGroup>
            <InputGroupInput
              placeholder={t("searchUsers")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <InputGroupAddon>
              <RiSearch2Line />
            </InputGroupAddon>
          </InputGroup>

          <ScrollArea className="h-60 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>{t("user")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : searchResults && searchResults.length > 0 ? (
                  searchResults.map((user) => {
                    const isExisting = existingMembers.some(
                      (m) => m.user.userId === user.userId,
                    );
                    if (isExisting) return null;

                    return (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUserIds.includes(user.userId)}
                            onCheckedChange={(checked) => {
                              setSelectedUserIds((prev) =>
                                checked
                                  ? [...prev, user.userId]
                                  : prev.filter((id) => id !== user.userId),
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>
                                {user.nickname?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {user.nickname}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {query ? t("noUsersFound") : t("typeToSearch")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t("cancel")}</Button>
          </DialogClose>
          <Button
            onClick={() => mutate()}
            disabled={selectedUserIds.length === 0 || isPending}
          >
            {isPending && (
              <RiLoader2Line className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("invite")} ({selectedUserIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
