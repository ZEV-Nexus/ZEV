import { getCurrentUser } from "@/shared/service/server/auth";
import { apiResponse } from "@/shared/service/server/response";
import { connectMongoose } from "@/shared/lib/mongoose";
import { userModel } from "@/shared/schema";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({
        ok: false,
        message: "Unauthorized",
        status: 401,
      });
    }

    // Get the user's GitHub username from DB
    await connectMongoose();
    const dbUser = await userModel.findOne({ userId: user.userId });
    const githubUsername = (dbUser as any)?.githubUsername;

    if (!githubUsername) {
      return apiResponse({
        ok: false,
        message: "GitHub 帳號尚未連結，請使用 GitHub 登入來連結帳號",
        status: 400,
      });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("per_page") || "30");
    const sort = searchParams.get("sort") || "updated"; // updated, created, pushed, full_name

    // Fetch the user's own repos via GitHub API
    const githubRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(githubUsername)}/repos?sort=${sort}&per_page=${perPage}&page=${page}&type=owner`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "chat.to",
        },
        next: { revalidate: 120 }, // cache for 2 minutes
      },
    );

    if (!githubRes.ok) {
      const err = await githubRes.text();
      return apiResponse({
        ok: false,
        message: `GitHub API error: ${err}`,
        status: githubRes.status,
      });
    }

    const data = await githubRes.json();

    const repos = data.map((item: any) => ({
      owner: item.owner.login,
      repo: item.name,
      fullName: item.full_name,
      url: item.html_url,
      description: item.description || "",
      stars: item.stargazers_count,
      language: item.language || "",
      forks: item.forks_count,
      avatar: item.owner.avatar_url,
      isPrivate: item.private,
      updatedAt: item.updated_at,
    }));

    return apiResponse({ ok: true, data: repos });
  } catch (error) {
    return apiResponse({
      ok: false,
      message: error instanceof Error ? error.message : "Failed to fetch repos",
      status: 500,
    });
  }
}
