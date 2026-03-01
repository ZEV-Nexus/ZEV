import { NextRequest, NextResponse } from "next/server";
import { userApiKeyModel } from "@/shared/schema";
import {
  createUserApiKey,
  getUserApiKey,
  getUserApiKeys,
  updateUserApiKey,
} from "@/shared/service/server/user-api-key";
import { getCurrentUser } from "@/shared/service/server/auth";
import { apiResponse } from "@/shared/service/server/response";

export async function GET(request: NextRequest) {
  const apiKey = request.nextUrl.searchParams.get("apiKey");

  // Internal proxy lookup by raw apiKey value
  if (apiKey) {
    const userApiKey = await userApiKeyModel.findOne({ apiKey });
    if (!userApiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    return NextResponse.json({ apiKey: userApiKey.apiKey });
  }

  // Return current user's stored providers (masked, no plaintext)
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const keys = await getUserApiKeys(user.id);
  const maskedKeys: Record<string, { key: string; id: string }> =
    Object.fromEntries(
      keys.map((k) => [k.provider, { key: k.maskedKey, id: k.id }]),
    );
  return apiResponse({ data: { apiKeys: maskedKeys } });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const {
      apiKeys,
    }: { apiKeys: Record<string, { key: string; id?: string }> } =
      await request.json();
    if (!apiKeys) {
      return NextResponse.json({ error: "Missing API key" }, { status: 400 });
    }

    const userApiKey = await Promise.all(
      Object.entries(apiKeys).map(async ([provider, data]) => {
        const { key, id } = data;
        if (key.length < 8) {
          return {
            id: id || "",
            key: "",
            provider,
          };
        }
        const existingKeys = await getUserApiKey(id || "");

        if (key.trim() === "") {
          return {
            id: existingKeys?.id || "",
            key: existingKeys?.maskedKey || "",
            provider,
          };
        } else if (!existingKeys) {
          const apiKey = await createUserApiKey(user.id, key, provider);
          return {
            id: apiKey.id,
            key: apiKey.maskedKey,
            provider: apiKey.provider,
          };
        } else {
          const newApiKey = await updateUserApiKey(
            user.id,
            existingKeys.id,
            key,
          );
          return {
            id: existingKeys.id,
            key: newApiKey?.maskedKey || "",
            provider,
          };
        }
      }),
    );

    return apiResponse({
      data: {
        apiKeys: Object.fromEntries(
          userApiKey.map((k) => [k?.provider, { key: k?.key, id: k?.id }]),
        ),
      },
    });
  } catch (error: unknown) {
    return apiResponse({
      error: (error as Error)?.message || "Unknown error",
      status: 500,
    });
  }
}
