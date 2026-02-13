import { User } from "@/shared/types";
import { fetchApi } from "./fetch";

export async function getUserByQuery(query: string) {
  const response = await fetchApi<
    Pick<User, "id" | "userId" | "email" | "nickname" | "avatar">[]
  >(`user/search?query=${encodeURIComponent(query)}`);
  return response.data;
}

