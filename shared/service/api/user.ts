import { User } from "@/shared/types";
import { fetchApi } from "./fetch";

export async function getUserByQuery(query: string) {
  const response = await fetchApi<
    Pick<User, "id" | "userId" | "email" | "nickname" | "avatar">[]
  >(`user/search?query=${encodeURIComponent(query)}`);
  return response.data;
}

export async function getUserProfile(username: string) {
  const response = await fetchApi<
    Pick<
      User,
      "id" | "userId" | "username" | "nickname" | "email" | "bio" | "avatar"
    > & { createdAt: string }
  >(`user/profile/${encodeURIComponent(username)}`);
  return response.data;
}

export async function updateUsername(username: string) {
  return await fetchApi<{ username: string }>("user/username", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export async function updateProfile(data: {
  nickname?: string;
  bio?: string;
  avatar?: string;
}) {
  return await fetchApi<{ nickname: string; bio: string; avatar: string }>(
    "user/profile",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}
