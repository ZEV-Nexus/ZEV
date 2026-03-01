import { UserOAuthAccount } from "@/shared/types";
import { fetchApi } from "./fetch";

export const getUserOAuths = async (userId: string) => {
  const response = await fetchApi<UserOAuthAccount[]>(`/third-part`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  return response.data;
};

export const deleteUserOAuthApi = async (id: string, provider: string) => {
  const response = await fetchApi(`/third-part/oauth/${provider}/disconnect`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
  return response;
};
