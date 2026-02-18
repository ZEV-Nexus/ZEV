import { getCurrentUser } from "@/shared/service/server/auth";
import { toggleLike } from "@/shared/service/server/post";
import { apiResponse } from "@/shared/service/server/response";

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
    const result = await toggleLike(postId, user.userId);
    return apiResponse({ ok: true, data: result });
  } catch (error) {
    return apiResponse({
      ok: false,
      message: error instanceof Error ? error.message : "Failed to toggle like",
      status: 500,
    });
  }
}
