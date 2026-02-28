"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import AppActivityBar from "./components/app-activity-bar";
import AblyNotificationProvider from "@/shared/components/provider/ably-notification-provider";
import {
  SidebarInset,
  SidebarProvider,
} from "@/shared/shadcn/components/ui/sidebar";
import { useIsMobile } from "@/shared/shadcn/hooks/use-mobile";
import { useAIStore } from "@/shared/store/ai-store";
import { useChatStore } from "@/shared/store/chat-store";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = new QueryClient();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");
  const isMobile = useIsMobile();
  useEffect(() => {
    useAIStore.persist.rehydrate();
    useChatStore.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={client}>
      <AblyNotificationProvider>
        <SidebarProvider
          open={false}
          onOpenChange={() => {}}
          style={
            {
              "--sidebar-width": "3rem",
              "--sidebar-width-icon": "3rem",
            } as React.CSSProperties
          }
        >
          {isAuthPage ? (
            <div className="min-h-svh flex-1">{children}</div>
          ) : isMobile ? (
            /* Mobile: content full width, bottom bar fixed */
            <div className="flex flex-col h-svh flex-1">
              <div className="flex-1 min-h-0 overflow-auto">{children}</div>
              <AppActivityBar />
            </div>
          ) : (
            <>
              <AppActivityBar />
              <SidebarInset>{children}</SidebarInset>
            </>
          )}
        </SidebarProvider>
      </AblyNotificationProvider>
    </QueryClientProvider>
  );
}
