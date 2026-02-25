import type {
  ChatNavCategory,
  ChatRoom,
  Member,
  RoomType,
  User,
} from "@/shared/types";
import { fetchApi } from "./fetch";

export type SearchRoom = Pick<
  ChatRoom,
  "id" | "roomId" | "name" | "avatar" | "roomType" | "createdAt"
>;

export async function searchRooms(query: string) {
  const response = await fetchApi<SearchRoom[]>(
    `rooms/search?query=${encodeURIComponent(query)}`,
  );
  return response.data;
}

export const createRoom = async (
  userId: string,
  roomName: string,
  roomType: RoomType,
  roomMembers: Pick<User, "id" | "userId" | "email" | "nickname" | "avatar">[],
  categoryId?: string,
) => {
  const response = await fetchApi<{ room: ChatRoom; members: Member[] }>(
    `rooms/create`,
    {
      method: "POST",
      body: JSON.stringify({
        userId,
        roomName,
        roomType,
        roomMembers,
        categoryId,
      }),
    },
  );
  return response.data;
};
export const getUserRooms = async () => {
  const response = await fetchApi<ChatNavCategory[]>(`rooms`);
  const newGroups = response.data.map(async (group) => {
    const newGroup = group.items.map(async (item) => {
      const members = await getRoomMembers(item.id);
      return {
        ...item,
        members,
      };
    });
    group.items = await Promise.all(newGroup);
    return group;
  });
  console.log(newGroups);
  return Promise.all(newGroups);
};

export const getRoomMembers = async (roomId: string) => {
  const response = await fetchApi<Member[]>(`rooms/${roomId}/members`);
  return response.data;
};

export const updateRoomSettings = async (
  roomId: string,
  settings: { notificationSetting?: string; pinned?: boolean },
) => {
  return await fetchApi(`rooms/${roomId}/settings`, {
    method: "POST",
    body: JSON.stringify(settings),
  });
};

export const inviteMembers = async (roomId: string, userIds: string[]) => {
  return await fetchApi(`rooms/${roomId}/invite`, {
    method: "POST",
    body: JSON.stringify({ userIds }),
  });
};

export const updateMemberRole = async (
  roomId: string,
  memberId: string,
  role: "admin" | "owner" | "member" | "guest",
) => {
  return await fetchApi(`rooms/${roomId}/members/role`, {
    method: "POST",
    body: JSON.stringify({ memberId, role }),
  });
};

export const updateRoomInfo = async (
  roomId: string,
  info: { name?: string; avatar?: string },
) => {
  return await fetchApi(`rooms/${roomId}/info`, {
    method: "POST",
    body: JSON.stringify(info),
  });
};
