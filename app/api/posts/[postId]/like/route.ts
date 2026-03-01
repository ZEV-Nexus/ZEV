import { getCurrentUser } from "@/shared/service/server/auth";
import { toggleLike } from "@/shared/service/server/post";
import { apiResponse } from "@/shared/service/server/response";
import { createNotification } from "@/shared/service/server/notification";
import { postModel, userModel } from "@/shared/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
    }

    const { postId } = await params;

    // Toggle like
    const result = await toggleLike(postId, user.id);

    // If liked (not unlike), create notification
    if (result.liked) {
      const dbUser = await userModel.findById(user.id);
      const post = await postModel.findById(postId);

      if (dbUser && post && post.author.toString() !== dbUser._id.toString()) {
        await createNotification({
          recipientId: post.author.toString(),
          senderId: dbUser.id,
          type: "post_like",
          postId: post.id,
        });
      }
    }

    return apiResponse({ ok: true, data: result });
  } catch (error) {
    console.error(error);
    return apiResponse({
      ok: false,
      message: error instanceof Error ? error.message : "Failed to toggle like",
      status: 500,
    });
  }
}
