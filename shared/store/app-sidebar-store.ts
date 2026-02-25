"use client";

import { create } from "zustand";

export type ActivityPanel = "search" | "notifications" | null;

interface AppSidebarState {
  /** Currently active/open panel */
  activePanel: ActivityPanel;
  /** Toggle a panel: if already open, close it; otherwise open it */
  togglePanel: (panel: "search" | "notifications") => void;
  /** Close any open panel */
  closePanel: () => void;
}

export const useAppSidebarStore = create<AppSidebarState>((set, get) => ({
  activePanel: null,
  togglePanel: (panel) => {
    const current = get().activePanel;
    set({ activePanel: current === panel ? null : panel });
  },
  closePanel: () => set({ activePanel: null }),
}));
