"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { usePathname } from "next/navigation";
import AppActivityBar from "./components/app-activity-bar";
import AblyNotificationProvider from "@/shared/components/provider/ably-notification-provider";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = new QueryClient();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");

  return (
    <QueryClientProvider client={client}>
      <AblyNotificationProvider>
        <AppActivityBar />
        <div
          className="min-h-svh flex-1"
          style={{ marginLeft: isAuthPage ? 0 : "3.5rem" }}
        >
          {children}
        </div>
      </AblyNotificationProvider>
    </QueryClientProvider>
  );
}
