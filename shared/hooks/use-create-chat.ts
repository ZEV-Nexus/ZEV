"use client";
import { useCallback, useState } from "react";
import { getUserByQuery } from "../service/api/user";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { User } from "../types";
import { useDebounce } from "./use-debounce";
import type { RoomType } from "../types";
import { createRoom } from "../service/api/room";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useChatStore } from "../store/chat-store";

export default function useCreateChat(categoryId?: string) {
  const session = useSession();
  const { addChatRoom } = useChatStore();
  const [chatDetails, setChatDetails] = useState<{
    members: Pick<User, "id" | "userId" | "email" | "avatar" | "nickname">[];
    chatName: string;
    roomType: RoomType;
  }>({
    members: [],
    chatName: "",
    roomType: "dm",
  });

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const { data, isLoading, error } = useQuery({
    queryKey: ["search-members", debouncedQuery],
    queryFn: () => getUserByQuery(debouncedQuery),
  });

  const {
    mutate,
    isPending,
    error: MutationError,
  } = useMutation({
    mutationFn: () => createChat(),
    onSuccess: (data) => {
      if (!data) return;
      addChatRoom(data.room, data.members);
      toast.success("Room created successfully");
      setChatDetails({
        members: [],
        chatName: "",
        roomType: "dm",
      });
    },
    onError: (error) => {
      console.log(error);
      toast.error(error.message);
    },
  });

  const createChat = useCallback(async () => {
    const { members, chatName, roomType } = chatDetails;
    if (
      !session.data?.user.id ||
      (chatName === "" && roomType === "group") ||
      members.length === 0
    )
      return;
    const response = await createRoom(
      session.data?.user.id,
      chatName,
      roomType,
      members,
      categoryId,
    );
    return response;
  }, [session, chatDetails, categoryId]);

  return {
    chatDetails,
    setChatDetails,
    query,
    setQuery,
    searchResults: data,
    isLoading,
    error,
    mutate,
    isPending,
    MutationError,
  };
}
