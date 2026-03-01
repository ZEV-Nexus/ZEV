import { getCurrentUser } from "@/shared/service/server/auth";
import { connectMongoose } from "@/shared/lib/mongoose";
import { userModel } from "@/shared/schema";
import { NextResponse } from "next/server";

/**
 * GET /api/github/connect/callback
 * Handles the GitHub OAuth callback for account linking.
 * Exchanges authorization code for access token, fetches GitHub profile,
 * and saves the GitHub username to the current user's DB record.
 *
 * This does NOT create a new session or affect the current login —
 * it only links the GitHub identity.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Build the base URL for redirects
  const origin = url.origin;

  // GitHub OAuth error (user denied, etc.)
  if (error) {
    return renderClosePopup(origin, false, "GitHub 授權被取消");
  }

  if (!code || !state) {
    return renderClosePopup(origin, false, "無效的回呼參數");
  }

  // Verify the current user is still logged in
  const user = await getCurrentUser();
  if (!user) {
    return renderClosePopup(origin, false, "請先登入");
  }

  // Verify state parameter
  try {
    const stateData = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8"),
    );
    if (stateData.id !== user.id) {
      return renderClosePopup(origin, false, "驗證失敗，請重試");
    }
    // Check state is not older than 10 minutes
    if (Date.now() - stateData.ts > 10 * 60 * 1000) {
      return renderClosePopup(origin, false, "連結已過期，請重試");
    }
  } catch {
    return renderClosePopup(origin, false, "無效的狀態參數");
  }

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.AUTH_GITHUB_ID,
          client_secret: process.env.AUTH_GITHUB_SECRET,
          code,
        }),
      },
    );

    const tokenData = await tokenRes.json();
    console.log("GitHub token response:", tokenData);
    if (tokenData.error || !tokenData.access_token) {
      return renderClosePopup(
        origin,
        false,
        tokenData.error_description || "取得 GitHub 授權失敗",
      );
    }

    const profileRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "chat.to",
      },
    });

    if (!profileRes.ok) {
      return renderClosePopup(origin, false, "無法取得 GitHub 用戶資料");
    }

    const profile = await profileRes.json();
    const githubUsername = profile.login;
    console.log(profile);
    if (!githubUsername) {
      return renderClosePopup(origin, false, "無法取得 GitHub 用戶名");
    }

    // Save the GitHub username to the current user's DB record
    await connectMongoose();
    const dbUser = await userModel.findOne({ userId: user.id });

    if (!dbUser) {
      return renderClosePopup(origin, false, "找不到用戶資料");
    }

    await userModel.findByIdAndUpdate(dbUser._id, { githubUsername });

    return renderClosePopup(
      origin,
      true,
      `已成功連結 GitHub 帳號: ${githubUsername}`,
    );
  } catch (err) {
    console.error("GitHub connect callback error:", err);
    return renderClosePopup(origin, false, "連結 GitHub 帳號時發生錯誤");
  }
}

/**
 * Renders a minimal HTML page that notifies the parent window
 * (via postMessage) of the result and closes the popup.
 */
function renderClosePopup(origin: string, success: boolean, message: string) {
  const html = `<!DOCTYPE html>
<html>
<head><title>GitHub 帳號連結</title></head>
<body>
  <p>${message}</p>
  <script>
    if (window.opener) {
      window.opener.postMessage(
        { type: "github-connect", success: ${success}, message: "${message.replace(/"/g, '\\"')}" },
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
