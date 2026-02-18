import { getCurrentUser } from "@/shared/service/server/auth";
import { getCommentsByPost, createComment } from "@/shared/service/server/post";
import { apiResponse } from "@/shared/service/server/response";
import { connectMongoose } from "@/shared/lib/mongoose";
import { userModel } from "@/shared/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const { postId } = await params;
    const comments = await getCommentsByPost(postId);
    return apiResponse({ ok: true, data: comments });
  } catch (error) {
    return apiResponse({
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch comments",
      status: 500,
    });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
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

    const { postId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return apiResponse({
        ok: false,
        message: "Content is required",
        status: 400,
      });
    }

    const comment = await createComment({
      postId,
      authorId: dbUser.id,
      content: content.trim(),
    });

    return apiResponse({ ok: true, data: comment });
  } catch (error) {
    return apiResponse({
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to create comment",
      status: 500,
    });
  }
}
