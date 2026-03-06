import { fetchApi } from "./fetch";
import type { UserApiKey } from "@/shared/store/ai-store";

export async function getUserApiKeys(): Promise<UserApiKey> {
  const response = await fetchApi<{
    apiKeys: UserApiKey;
  }>("/ai/key");
  return response.data?.apiKeys ?? {};
}

export async function saveUserApiKeys(
  apiKeys: UserApiKey,
): Promise<UserApiKey> {
  const response = await fetchApi<{
    apiKeys: UserApiKey;
  }>("/ai/key", {
    method: "POST",
    body: JSON.stringify({ apiKeys }),
  });

  return response.data?.apiKeys ?? {};
}

export async function deleteUserApiKey(provider: string) {
  await fetchApi("/ai/key", {
    method: "DELETE",
    body: JSON.stringify({ provider }),
  });
}
