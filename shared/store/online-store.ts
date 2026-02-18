import { create } from "zustand";

export interface OnlineUser {
  clientId: string;
  userId: string;
  nickname: string;
  avatar?: string;
}

interface OnlineState {
  onlineUsers: Map<string, OnlineUser>;
}

interface OnlineAction {
  setOnlineUsers: (users: OnlineUser[]) => void;
  isUserOnline: (userId: string) => boolean;
  getOnlineCount: () => number;
}

type OnlineStore = OnlineState & OnlineAction;

export const useOnlineStore = create<OnlineStore>()((set, get) => ({
  onlineUsers: new Map(),

  setOnlineUsers: (users) => {
    const map = new Map<string, OnlineUser>();
    users.forEach((u) => map.set(u.userId, u));
    set({ onlineUsers: map });
  },

  isUserOnline: (userId) => {
    return get().onlineUsers.has(userId);
  },

  getOnlineCount: () => {
    return get().onlineUsers.size;
  },
}));
