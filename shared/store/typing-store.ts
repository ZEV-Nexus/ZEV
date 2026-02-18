import { create } from "zustand";

export interface TypingUser {
  userId: string;
  nickname: string;
}

interface TypingState {
  /** Map<roomId, Map<userId, TypingUser>> */
  typingByRoom: Map<string, Map<string, TypingUser>>;
}

interface TypingAction {
  setUserTyping: (roomId: string, user: TypingUser) => void;
  clearUserTyping: (roomId: string, userId: string) => void;
  getTypingUsers: (roomId: string) => TypingUser[];
  isRoomTyping: (roomId: string) => boolean;
}

type TypingStore = TypingState & TypingAction;

// Auto-clear timeout: if no new typing event within 3 seconds, consider stopped
const TYPING_TIMEOUT_MS = 3000;
const typingTimers = new Map<string, NodeJS.Timeout>();

export const useTypingStore = create<TypingStore>()((set, get) => ({
  typingByRoom: new Map(),

  setUserTyping: (roomId, user) => {
    const timerKey = `${roomId}:${user.userId}`;

    // Clear existing timer
    const existingTimer = typingTimers.get(timerKey);
    if (existingTimer) clearTimeout(existingTimer);

    // Set new auto-clear timer
    const timer = setTimeout(() => {
      get().clearUserTyping(roomId, user.userId);
      typingTimers.delete(timerKey);
    }, TYPING_TIMEOUT_MS);
    typingTimers.set(timerKey, timer);

    set((state) => {
      const newMap = new Map(state.typingByRoom);
      const roomTyping = new Map(newMap.get(roomId) || new Map());
      roomTyping.set(user.userId, user);
      newMap.set(roomId, roomTyping);
      return { typingByRoom: newMap };
    });
  },

  clearUserTyping: (roomId, userId) => {
    const timerKey = `${roomId}:${userId}`;
    const existingTimer = typingTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      typingTimers.delete(timerKey);
    }

    set((state) => {
      const newMap = new Map(state.typingByRoom);
      const roomTyping = new Map(newMap.get(roomId) || new Map());
      roomTyping.delete(userId);
      if (roomTyping.size === 0) {
        newMap.delete(roomId);
      } else {
        newMap.set(roomId, roomTyping);
      }
      return { typingByRoom: newMap };
    });
  },

  getTypingUsers: (roomId) => {
    const roomTyping = get().typingByRoom.get(roomId);
    if (!roomTyping) return [];
    return Array.from(roomTyping.values());
  },

  isRoomTyping: (roomId) => {
    const roomTyping = get().typingByRoom.get(roomId);
    return !!roomTyping && roomTyping.size > 0;
  },
}));
