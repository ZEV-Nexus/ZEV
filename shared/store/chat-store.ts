import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ChatNavCategory,
  ChatNavItem,
  ChatRoom,
  Member,
  Message,
} from "../types";

interface ChatState {
  chatCategorys: ChatNavCategory[];
}

interface ChatAction {
  setChatCategorys: (chatCategorys: ChatNavCategory[], userId?: string) => void;

  addChatCategory: (chatCategory: ChatNavCategory) => void;
  removeChatCategory: (categoryId: string) => void;
  updateChatCategoryTitle: (categoryId: string, title: string) => void;
  addChatRoom: (chatRoom: ChatRoom, members: Member[]) => void;
  updateRoomSettings: (
    roomId: string,
    userId: string,
    settings: {
      notificationSetting?: "all" | "mentions" | "mute";
      pinned?: boolean;
    },
  ) => void;
  updateRoomLastMessage: (roomId: string, message: Message) => void;
  clearUnreadCount: (roomId: string) => void;
}

type ChatStore = ChatState & ChatAction;

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chatCategorys: [],
      setChatCategorys: (chatCategorys, userId) => {
        const currentCategorys = get().chatCategorys;
        const syncedCategorys = chatCategorys.map((apiCategory) => {
          const existingCategory = currentCategorys.find(
            (cat) => cat.id === apiCategory.id,
          );

          let items = apiCategory.items;
          if (userId) {
            items = sortChatItems(apiCategory.items, userId);
          } else if (existingCategory) {
            // If we are not sorting (no userId), and ignoring existing items sorting?
            // Actually, if we are setting new categories (e.g. from API or D&D), we use the input `apiCategory.items`.
            // Ideally if userId is NOT provided, we assume `chatCategorys` input is already in desired order (e.g. from D&D).
          }

          // 如果分類已存在，保留現有的 items，只更新其他欄位
          if (existingCategory) {
            return {
              ...existingCategory,
              items: items,
            };
          }
          // 如果分類不存在，直接使用 API 的資料
          return { ...apiCategory, items: items };
        });
        set({ chatCategorys: syncedCategorys });
      },

      addChatCategory: (chatCategory) => {
        const currentCategorys = get().chatCategorys;
        // 預設分類的 IDs
        const defaultCategoryIds = ["dm", "group"];

        // 找到最後一個預設分類的索引
        const lastDefaultIndex = currentCategorys.findLastIndex((cat) =>
          defaultCategoryIds.includes(cat.id),
        );

        // 如果找到預設分類，插入到其後；否則插入到開頭
        const insertIndex = lastDefaultIndex !== -1 ? lastDefaultIndex + 1 : 0;

        const newCategorys = [
          ...currentCategorys.slice(0, insertIndex),
          chatCategory,
          ...currentCategorys.slice(insertIndex),
        ];

        set({ chatCategorys: newCategorys });
      },

      updateChatCategoryTitle: (categoryId: string, title: string) => {
        const currentCategorys = get().chatCategorys;
        const newCategorys = currentCategorys.map((cat) =>
          cat.id === categoryId ? { ...cat, title } : cat,
        );
        set({ chatCategorys: newCategorys });
      },

      removeChatCategory: (categoryId: string) => {
        const currentCategorys = get().chatCategorys;
        const categoryToRemove = currentCategorys.find(
          (c) => c.id === categoryId,
        );

        if (!categoryToRemove) return;

        // Filter out the deleted category
        let newCategorys = currentCategorys.filter((c) => c.id !== categoryId);

        // Move items back to default categories
        if (categoryToRemove.items && categoryToRemove.items.length > 0) {
          const dmItems = categoryToRemove.items.filter(
            (item) => item.room?.roomType === "dm",
          );
          const groupItems = categoryToRemove.items.filter(
            (item) => item.room?.roomType !== "dm",
          );

          newCategorys = newCategorys.map((cat) => {
            if (cat.id === "dm") {
              return { ...cat, items: [...cat.items, ...dmItems] };
            }
            if (cat.id === "group") {
              return { ...cat, items: [...cat.items, ...groupItems] };
            }
            return cat;
          });
        }

        set({ chatCategorys: newCategorys });
      },
      addChatRoom: (chatRoom, members) => {
        const currentChatCategorys = get().chatCategorys;

        // 找到有 roomCategory 的成員（通常是當前使用者）
        const memberWithCategory = members.find((m) => m.roomCategory);
        const roomCategory = memberWithCategory?.roomCategory;

        const newChatCategorys = currentChatCategorys.map((cr) => {
          // 判斷這個 chatRoom 是否應該加到這個分類中
          const shouldAddToThisCategory =
            // 情況 1: 有自定義 roomCategory，且匹配當前分類
            (roomCategory && cr.id === roomCategory.id) ||
            // 情況 2: 沒有 roomCategory，根據 roomType 分類到 dm 或 group
            (!roomCategory && cr.id === chatRoom?.roomType);

          // 如果應該加到這個分類，且不重複
          if (
            shouldAddToThisCategory &&
            !cr.items.some((item) => item.id === chatRoom?.id)
          ) {
            return {
              ...cr,
              items: [
                ...cr.items,
                {
                  id: chatRoom.id,
                  name: chatRoom.name,
                  lastMessage: chatRoom.lastMessage,
                  room: chatRoom,
                  members: members,
                },
              ] as ChatNavItem[],
            };
          }

          return cr;
        });
        console.log(newChatCategorys);
        set({ chatCategorys: newChatCategorys });
      },
      updateRoomSettings: (roomId, userId, settings) => {
        const currentCategorys = get().chatCategorys;
        const newCategorys = currentCategorys.map((cat) => {
          let hasUpdated = false;
          const updatedItems = cat.items.map((item) => {
            // Find the item. Check item.id and item.room.roomId / item.room.id
            if (
              item.id === roomId ||
              item.room?.id === roomId ||
              item.room?.roomId === roomId
            ) {
              hasUpdated = true;
              return {
                ...item,
                members: item.members?.map((m) => {
                  if (m.user.userId === userId) {
                    return {
                      ...m,
                      ...settings,
                      notificationSetting:
                        settings.notificationSetting || m.notificationSetting,
                      pinned:
                        settings.pinned !== undefined
                          ? settings.pinned
                          : m.pinned,
                    };
                  }
                  return m;
                }),
              };
            }
            return item;
          });

          if (hasUpdated) {
            return {
              ...cat,
              items: sortChatItems(updatedItems, userId),
            };
          }
          return cat;
        });
        set({ chatCategorys: newCategorys });
      },
      updateRoomLastMessage: (roomId, message) => {
        const currentCategorys = get().chatCategorys;
        const newCategorys = currentCategorys.map((cat) => {
          let hasUpdated = false;
          const updatedItems = cat.items.map((item) => {
            // Find the item. Check item.id and item.room.roomId / item.room.id
            if (
              item.id === roomId ||
              item.room?.id === roomId ||
              item.room?.roomId === roomId
            ) {
              hasUpdated = true;
              return {
                ...item,
                room: {
                  ...item.room,
                  lastMessage: message,
                },
              };
            }
            return item;
          });

          if (hasUpdated) {
            return {
              ...cat,
              items: sortChatItems(updatedItems),
            };
          }
          return cat;
        });
        set({ chatCategorys: newCategorys });
      },
      clearUnreadCount: (roomId) => {
        const currentCategorys = get().chatCategorys;
        const newCategorys = currentCategorys.map((cat) => {
          let hasUpdated = false;
          const updatedItems = cat.items.map((item) => {
            if (
              item.id === roomId ||
              item.room?.id === roomId ||
              item.room?.roomId === roomId
            ) {
              hasUpdated = true;
              return {
                ...item,
                unreadCount: 0,
              };
            }
            return item;
          });

          if (hasUpdated) {
            return {
              ...cat,
              items: updatedItems,
            };
          }
          return cat;
        });
        set({ chatCategorys: newCategorys });
      },
    }),
    {
      name: "chat-store",
    },
  ),
);

const sortChatItems = (items: ChatNavItem[], userId?: string) => {
  return [...items].sort((a, b) => {
    const pinnedA = userId
      ? a.members?.find((m) => m.user.userId === userId)?.pinned
      : false;
    const pinnedB = userId
      ? b.members?.find((m) => m.user.userId === userId)?.pinned
      : false;

    if (pinnedA !== pinnedB) return pinnedA ? -1 : 1;

    const timeA = new Date(
      a.room.lastMessage?.createdAt || a.room.createdAt,
    ).getTime();
    const timeB = new Date(
      b.room.lastMessage?.createdAt || b.room.createdAt,
    ).getTime();

    return timeB - timeA;
  });
};
