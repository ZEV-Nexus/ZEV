import { getCurrentUser } from "@/shared/service/server/auth";
import { deletePost } from "@/shared/service/server/post";
import { apiResponse } from "@/shared/service/server/response";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
    }

    const { postId } = await params;
    await deletePost(postId, user.userId);
    return apiResponse({ ok: true, data: null });
  } catch (error) {
    return apiResponse({
      ok: false,
      message: error instanceof Error ? error.message : "Failed to delete post",
      status: 500,
    });
  }
}
