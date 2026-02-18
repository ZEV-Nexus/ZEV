import { getCurrentUser } from "@/shared/service/server/auth";
import { createPost, getPosts } from "@/shared/service/server/post";
import { apiResponse } from "@/shared/service/server/response";
import { connectMongoose } from "@/shared/lib/mongoose";
import { userModel } from "@/shared/schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const result = await getPosts({ page, limit });
    return apiResponse({ ok: true, data: result });
  } catch (error) {
    return apiResponse({
      ok: false,
      message: error instanceof Error ? error.message : "Failed to fetch posts",
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
    }

    await connectMongoose();
    const dbUser = await userModel.findOne({ userId: user.userId });
    if (!dbUser) {
      return apiResponse({ ok: false, message: "User not found", status: 404 });
    }

    const body = await request.json();
    const { content, images, githubRepo } = body;

    if (!content || content.trim().length === 0) {
      return apiResponse({
        ok: false,
        message: "Content is required",
        status: 400,
      });
    }

    const post = await createPost({
      authorId: dbUser.id,
      content: content.trim(),
      images,
      githubRepo,
    });

    return apiResponse({ ok: true, data: JSON.parse(JSON.stringify(post)) });
  } catch (error) {
    return apiResponse({
      ok: false,
      message: error instanceof Error ? error.message : "Failed to create post",
      status: 500,
    });
  }
}
