import { oauthClient } from "@/shared/lib/google-auth";

import { getCurrentUser } from "@/shared/service/server/auth";

import {
  createUserOAuth,
  findUserOAuthByService,
  updateUserOAuthTokens,
} from "@/shared/service/server/user-oauth-account";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const url = new URL(req.url);
    const origin = url.origin;
    if (!user) {
      return renderClosePopup(origin, false, "Unauthorized");
    }

    const code = url.searchParams.get("code");
    const { service } = JSON.parse(url.searchParams.get("state") || "{}");
    const error = url.searchParams.get("error");
    console.log(code, service, service, error);
    if (!code) {
      return renderClosePopup(origin, false, "Missing code parameter");
    }
    const { tokens } = await oauthClient.getToken(code);

    console.log("Google OAuth tokens:", tokens);
    if (!tokens.access_token) {
      return renderClosePopup(origin, false, "Failed to obtain  token");
    }
    const existingAccount = await findUserOAuthByService(user.id, service);
    if (existingAccount && tokens.refresh_token) {
      await updateUserOAuthTokens(user.id, service, tokens.refresh_token);
    } else if (tokens.refresh_token) {
      await createUserOAuth(
        user.id,
        "google",
        service,
        tokens?.refresh_token ?? "",
      );
    }

    return renderClosePopup(origin, true, "Google 帳號連結成功");
  } catch (error: unknown) {
    console.error("Google OAuth callback error:", error);
    return renderClosePopup(
      origin,
      false,
      "Failed to authenticate with Google",
    );
  }
}

function renderClosePopup(origin: string, success: boolean, message: string) {
  const html = `<!DOCTYPE html>
<html>
<head><title>Google 帳號連結</title></head>
<body>
  <p>${message}</p>
  <script>
    if (window.opener) {
      window.opener.postMessage(
        { type: "google-connect", success: ${success}, message: "${message.replace(/"/g, '\\"')}" },
        "${origin}"
      );
      window.close();
    } else {
      // If not a popup, redirect back to home
      setTimeout(() => { window.location.href = "${origin}"; }, 2000);
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
