import { encrypt } from "@/shared/lib/key-authentication";
import { userApiKeyModel } from "@/shared/schema";

export async function getUserApiKeys(userId: string) {
  const apiKeys = await userApiKeyModel.find({ user: userId });
  return apiKeys;
}

export async function getUserApiKey(id: string) {
  if (!id) return null;
  const apiKey = await userApiKeyModel.findById(id);
  return apiKey;
}

export async function deleteUserApiKey(id: string) {
  await userApiKeyModel.findByIdAndDelete(id);
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
  keyId: string,
  apiKey: string,
  provider: string,
) {
  const { encrypted, iv, tag } = encrypt(apiKey);
  const key = await userApiKeyModel.findOneAndUpdate(
    { _id: keyId },
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
