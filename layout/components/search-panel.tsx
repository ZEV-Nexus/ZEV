"use client";

import React, { useState } from "react";
import { Input } from "@/shared/shadcn/components/ui/input";
import {
  RiSearchLine,
  RiUserLine,
  RiChat1Line,
  RiLoader2Line,
} from "@remixicon/react";
import { ScrollArea } from "@/shared/shadcn/components/ui/scroll-area";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { getUserByQuery } from "@/shared/service/api/user";
import { searchRooms, type SearchRoom } from "@/shared/service/api/room";
import type { User } from "@/shared/types";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type SearchUser = Pick<
  User,
  "id" | "userId" | "email" | "nickname" | "avatar" | "username"
>;

interface SearchPanelProps {
  onClose?: () => void;
}

export default function SearchPanel({ onClose }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);
  const router = useRouter();
  const t = useTranslations("common");

  const hasQuery = debouncedQuery.trim().length > 0;

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["search-users", debouncedQuery],
    queryFn: () => getUserByQuery(debouncedQuery),
    enabled: hasQuery,
  });

  const { data: rooms, isLoading: isLoadingRooms } = useQuery({
    queryKey: ["search-rooms", debouncedQuery],
    queryFn: () => searchRooms(debouncedQuery),
    enabled: hasQuery,
  });

  const isLoading = isLoadingUsers || isLoadingRooms;
  const hasResults = (users && users.length > 0) || (rooms && rooms.length > 0);

  const handleUserClick = (user: SearchUser) => {
    onClose?.();
    router.push(`/${user.username}`);
  };

  const handleRoomClick = (room: SearchRoom) => {
    onClose?.();
    router.push(`/c/${room.roomId}`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h2 className="text-base font-semibold text-foreground mb-3">
          {t("searchTitle")}
        </h2>
        <div className="relative">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {!query.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RiSearchLine className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">{t("typeToSearch")}</p>
            </div>
          ) : isLoading && !hasResults ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RiLoader2Line className="h-6 w-6 animate-spin mb-3" />
              <p className="text-sm">{t("searching")}</p>
            </div>
          ) : !hasResults ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">
                {t("noResults")} &quot;{debouncedQuery}&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Users group */}
              {users && users.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
                    <RiUserLine className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("users")} ({users.length})
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleUserClick(user)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={user.avatar} alt={user.nickname} />
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {user.nickname?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {user.nickname}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rooms group */}
              {rooms && rooms.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
                    <RiChat1Line className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("chatRooms")} ({rooms.length})
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    {rooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => handleRoomClick(room)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={room.avatar} alt={room.name} />
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {room.name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {room.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {room.roomType === "group"
                              ? t("group")
                              : t("channel")}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
