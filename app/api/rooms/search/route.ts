import { connectMongoose } from "@/shared/lib/mongoose";
import { memberModel, roomModel } from "@/shared/schema";
import { getCurrentUser } from "@/shared/service/server/auth";
import { apiResponse } from "@/shared/service/server/response";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({ ok: false, error: "Unauthorized", status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";

    if (!query.trim()) {
      return apiResponse({ ok: true, data: [] });
    }

    await connectMongoose();

    // Find all rooms the current user is a member of
    const userMembers = await memberModel
      .find({ user: user.id })
      .select("room")
      .lean();
    const userRoomIds = userMembers.map((m) => m.room);

    // Search rooms by name (only rooms user belongs to, exclude DMs)
    const rooms = await roomModel
      .find({
        _id: { $in: userRoomIds },
        roomType: { $ne: "dm" },
        name: { $regex: query, $options: "i" },
      })
      .select("_id roomId name avatar roomType createdAt")
      .limit(20)
      .lean();

    const result = rooms.map((room) => ({
      id: room._id.toString(),
      roomId: room.roomId,
      name: room.name,
      avatar: room.avatar,
      roomType: room.roomType,
      createdAt: room.createdAt,
    }));

    return apiResponse({ ok: true, data: result });
  } catch (error: unknown) {
    console.error("Room search error:", error);
    return apiResponse({
      ok: false,
      error: (error as Error).message || "Internal Server Error",
      status: 500,
    });
  }
}
