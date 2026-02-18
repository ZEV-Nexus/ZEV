"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { usePathname } from "next/navigation";
import AppActivityBar from "./components/app-activity-bar";
import { SidebarProvider } from "@/shared/shadcn/components/ui/sidebar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = new QueryClient();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "22rem",
          "--sidebar-width-mobile": "20rem",
        } as React.CSSProperties
      }
    >
      <QueryClientProvider client={client}>
        <AppActivityBar />
        <div
          className="min-h-svh flex-1"
          style={{ marginLeft: isAuthPage ? 0 : "3.5rem" }}
        >
          {children}
        </div>
      </QueryClientProvider>
    </SidebarProvider>
  );
}
