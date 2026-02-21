"use client";

import { create } from "zustand";

export type ActivityPanel = "search" | "notifications" | "ai" | null;

interface AppSidebarState {
  /** Currently active/open panel */
  activePanel: ActivityPanel;
  /** Toggle a panel: if already open, close it; otherwise open it */
  togglePanel: (panel: "search" | "notifications" | "ai") => void;
  /** Close any open panel */
  closePanel: () => void;

  /** Whether the chat sidebar is open */
  chatSidebarOpen: boolean;
  /** Toggle the chat sidebar open/close */
  toggleChatSidebar: () => void;
  /** Explicitly set the chat sidebar state */
  setChatSidebarOpen: (open: boolean) => void;
}

export const useAppSidebarStore = create<AppSidebarState>((set, get) => ({
  activePanel: null,
  togglePanel: (panel) => {
    const current = get().activePanel;
    set({ activePanel: current === panel ? null : panel });
  },
  closePanel: () => set({ activePanel: null }),

  chatSidebarOpen: true,
  toggleChatSidebar: () =>
    set((state) => ({ chatSidebarOpen: !state.chatSidebarOpen })),
  setChatSidebarOpen: (open) => set({ chatSidebarOpen: open }),
}));
