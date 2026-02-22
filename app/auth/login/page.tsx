import Login from "@/feature/auth/login";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Log In",
  description:
    "Log in to ZEV to connect with your team. Access real-time messaging, channels, and collaboration tools built for developers and companies.",
  openGraph: {
    title: "Log In to ZEV",
    description:
      "Log in to ZEV to connect with your team. Access real-time messaging, channels, and collaboration tools.",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}
