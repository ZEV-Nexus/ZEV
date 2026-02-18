import { memberModel, messageModel, roomModel } from "@/shared/schema";
import { getCurrentUser } from "@/shared/service/server/auth";
import { apiResponse } from "@/shared/service/server/response";
import mongoose from "mongoose";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({
        ok: false,
        message: "Unauthorized",
        status: 401,
      });
    }

    const { roomId, messageId } = await req.json();

    if (!roomId) {
      return apiResponse({
        ok: false,
        message: "Room ID is required",
        status: 400,
      });
    }

    let targetMessageId = messageId;

    // If messageId is not provided, find the latest message in the room
    if (!targetMessageId) {
      const room = await roomModel.findById(roomId);
      if (room?.lastMessage) {
        targetMessageId = room.lastMessage;
      } else {
        // Fallback: find latest message
        const lastMsg = await messageModel
          .findOne({ room: roomId })
          .sort({ createdAt: -1 })
          .select("_id");

        if (lastMsg) {
          targetMessageId = lastMsg._id;
        }
      }
    }

    if (!targetMessageId) {
      // user read an empty room or something?
      // Just update nothing or set to null?
      // Usually if no messages, unread is 0 anyway.
      return apiResponse({
        ok: true,
        data: { success: true, message: "No messages to read" },
      });
    }

    // Update member's lastReadMessage
    await memberModel.findOneAndUpdate(
      {
        room: roomId,
        user: user.id,
      },
      {
        lastReadMessage: targetMessageId,
      },
    );

    return apiResponse({ ok: true, data: { success: true } });
  } catch (error) {
    console.error("[MARK_READ_ERROR]", error);
    return apiResponse({
      ok: false,
      message: "Internal Server Error",
      status: 500,
    });
  }
}
