import { getCurrentUser } from "@/shared/service/server/auth";
import { NextResponse } from "next/server";

/**
 * GET /api/github/connect
 * Initiates GitHub OAuth flow for account linking (NOT login).
 * Redirects user to GitHub authorization page.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.AUTH_GITHUB_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GitHub OAuth not configured" },
      { status: 500 },
    );
  }

  // Build the callback URL based on the current request origin
  const url = new URL(request.url);
  const callbackUrl = `${url.origin}/api/third-part/oauth/github/callback`;

  // Use a state parameter to prevent CSRF
  // Encode the userId so the callback knows who to link
  const state = Buffer.from(
    JSON.stringify({
      userId: user.id,
      ts: Date.now(),
    }),
  ).toString("base64url");

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", clientId);
  githubAuthUrl.searchParams.set("redirect_uri", callbackUrl);
  githubAuthUrl.searchParams.set("scope", "read:user");
  githubAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(githubAuthUrl.toString());
}
