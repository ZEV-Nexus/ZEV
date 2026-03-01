import { getCurrentUser } from "@/shared/service/server/auth";
import { apiResponse } from "@/shared/service/server/response";
import {
  getRoomMedia,
  verifyRoomMembership,
  MediaType,
} from "@/shared/service/server/room-media";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
    }

    const { roomId } = await params;
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "image") as MediaType;
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before") || undefined;

    if (!["image", "file", "link"].includes(type)) {
      return apiResponse({
        ok: false,
        message: "Invalid type. Must be 'image', 'file', or 'link'",
        status: 400,
      });
    }

    // Verify membership
    const isMember = await verifyRoomMembership(roomId, user.id!);
    if (!isMember) {
      return apiResponse({
        ok: false,
        message: "You are not a member of this room",
        status: 403,
      });
    }

    const media = await getRoomMedia(roomId, type, limit, before);
    return apiResponse({ data: media });
  } catch (error: unknown) {
    console.error("Error fetching room media:", error);
    return apiResponse({
      ok: false,
      message: "Internal Server Error",
      status: 500,
    });
  }
}
