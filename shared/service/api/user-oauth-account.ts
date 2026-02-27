import { UserOAuthAccount } from "@/shared/types";
import { fetchApi } from "./fetch";

export const getUserOAuths = async (userId: string) => {
  const response = await fetchApi<UserOAuthAccount[]>(`/third-part`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  return response.data;
};
