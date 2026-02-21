import { NextRequest, NextResponse } from "next/server";
import { userApiKeyModel } from "@/shared/schema";
import {
  createUserApiKey,
  getUserApiKeys,
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
  const maskedKeys: Record<string, string> = Object.fromEntries(
    keys.map((k) => [k.provider, k.maskedKey]),
  );
  return apiResponse({ data: { apiKeys: maskedKeys } });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { apiKeys }: { apiKeys: Record<string, string> } = await request.json();
  if (!apiKeys) {
    return NextResponse.json({ error: "Missing API key" }, { status: 400 });
  }

  const userApiKey = await Promise.all(
    Object.entries(apiKeys).map(async ([provider, key]) => {
      if (key.trim() === "") {
        return { key: "", provider };
      }
      const apiKey = await createUserApiKey(user.id, key, provider);
      return { key: apiKey.maskedKey, provider: apiKey.provider };
    }),
  );

  return apiResponse({
    data: {
      apiKeys: Object.fromEntries(userApiKey.map((k) => [k.provider, k.key])),
    },
  });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { apiKeys }: { apiKeys: Record<string, string> } = await request.json();
  const userApiKey = await Promise.all(
    Object.entries(apiKeys).map(async ([provider, key]) => {
      if (key.trim() === "") {
        return { key: "", provider };
      }
      const apiKey = await createUserApiKey(user.id, key, provider);
      return { key: apiKey.maskedKey, provider: apiKey.provider };
    }),
  );
}
