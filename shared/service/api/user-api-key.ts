import { AIProvider } from "@/shared/store/ai-store";
import { fetchApi } from "./fetch";

export async function getUserApiKeys(): Promise<
  Partial<Record<AIProvider, string>>
> {
  const response = await fetchApi<{
    apiKeys: Partial<Record<AIProvider, string>>;
  }>("/ai/key");
  return response.data?.apiKeys ?? {};
}

export async function saveUserApiKeys(
  apiKeys: Record<AIProvider, string>,
): Promise<Partial<Record<AIProvider, string>>> {
  const response = await fetchApi<{
    apiKeys: Partial<Record<AIProvider, string>>;
  }>("/ai/key", {
    method: "POST",
    body: JSON.stringify({ apiKeys }),
  });

  return response.data?.apiKeys ?? {};
}
