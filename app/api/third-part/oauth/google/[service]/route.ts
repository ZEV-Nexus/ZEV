import { oauthClient } from "@/shared/lib/google-auth";
import { THIRD_PARTY_PROVIDERS } from "@/shared/config/third-part";
import { apiResponse } from "@/shared/service/server/response";
import { getCurrentUser } from "@/shared/service/server/auth";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ service: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
  }
  const { service } = await params;
  const { scope } = THIRD_PARTY_PROVIDERS.find(
    (provider) =>
      provider.provider === "google" && provider.service === service,
  )!;
  if (!scope) {
    return apiResponse({ ok: false, message: "Invalid service", status: 400 });
  }
  const oAuthUrl = oauthClient.generateAuthUrl({
    access_type: "offline",
    scope,
    state: JSON.stringify({
      service,
    }),
  });

  return NextResponse.redirect(`${oAuthUrl}`);
}
