import { encrypt } from "@/shared/lib/key-authcation";
import { userApiKeyModel } from "@/shared/schema";

export async function getUserApiKeys(userId: string) {
  const apiKeys = await userApiKeyModel.find({ user: userId });
  return apiKeys;
}

export async function getUserApiKey(userId: string, provider?: string) {
  const query: Record<string, string> = { user: userId };
  if (provider) {
    query.provider = provider;
  }
  const apiKeys = await userApiKeyModel.findOne(query);
  console.log("Retrieved API keys:", apiKeys);
  return apiKeys;
}

export async function createUserApiKey(
  userId: string,
  apiKey: string,
  provider: string,
) {
  const { encrypted, iv, tag } = encrypt(apiKey);
  const key = await userApiKeyModel.create({
    user: userId,
    apiKey: encrypted,
    ivKey: iv,
    tag,
    provider,
    maskedKey:
      apiKey.slice(0, 4) + "*".repeat(apiKey.length - 8) + apiKey.slice(-4),
  });

  return key;
}

export async function updateUserApiKey(
  userId: string,
  apiKey: string,
  provider: string,
) {
  const { encrypted, iv, tag } = encrypt(apiKey);
  const key = await userApiKeyModel.findOneAndUpdate(
    { user: userId, provider },
    {
      apiKey: encrypted,
      ivKey: iv,
      tag,
      maskedKey:
        apiKey.slice(0, 4) + "*".repeat(apiKey.length - 8) + apiKey.slice(-4),
    },
    { new: true },
  );

  return key;
}
