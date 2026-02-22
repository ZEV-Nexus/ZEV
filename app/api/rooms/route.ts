import { NextResponse } from "next/server";
import { getUserRooms } from "@/shared/service/server/member";
import { ChatNavCategory } from "@/shared/types";

import { getRoomCategories } from "@/shared/service/server/room-category";
import { getCurrentUser } from "@/shared/service/server/auth";
import { getUnreadCount } from "@/shared/service/server/message";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const rooms = (await getUserRooms(user.id)).filter(Boolean);
    const grouped: Record<string, ChatNavCategory> = {};
    const dmGroup: ChatNavCategory = {
      id: "dm",
      index: -1,
      title: "私人訊息",

      items: [],
    };
    const group: ChatNavCategory = {
      id: "group",
      index: -1,
      title: "群組",
      items: [],
    };

    const categories = await getRoomCategories(user.id);

    categories.map((category) => {
      grouped[category.id] = {
        id: category.id,
        index: category.index,
        title: category.title!,
        items: [],
      };
    });
    for (const memberObj of rooms) {
      const member = memberObj;
      const room = member.room;

      if (!room) continue;
      const unreadCount = await getUnreadCount(room.id, user.id);
      const roomCategory = member.roomCategory;

      const groupId = roomCategory?.id;
      const item = {
        id: room.id,
        unreadCount,
        room: {
          id: room.id,
          roomId: room.roomId ?? "",
          name: room.name ?? "",
          roomType: room.roomType ?? "dm",
          createdAt: new Date(room.createdAt || new Date()).toISOString(),
          lastMessage: room.lastMessage,
          avatar: room.avatar,
        },
      };

      if (groupId) {
        if (!grouped[groupId])
          grouped[groupId] = {
            id: groupId,
            index: roomCategory?.index || 0,
            title: roomCategory?.title || "",
            items: [],
          };
        grouped[groupId].items.push(item);
      } else {
        if (room.roomType === "dm") {
          dmGroup.items.push(item);
        } else {
          group.items.push(item);
        }
      }
    }

    const sortedGroups = Object.values(grouped).sort(
      (a, b) => (a.index || 0) - (b.index || 0),
    );
    sortedGroups.unshift(group);
    sortedGroups.unshift(dmGroup);

    return NextResponse.json({ ok: true, data: sortedGroups });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Something went wrong",
      },
      { status: 500 },
    );
  }
}
