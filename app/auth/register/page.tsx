import Register from "@/feature/auth/register";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your free ZEV account. Set up team channels, invite members, and start collaborating with real-time messaging and AI-powered tools.",
  openGraph: {
    title: "Sign Up for ZEV",
    description:
      "Create your free ZEV account. Set up team channels, invite members, and start collaborating instantly.",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function Page() {
  return <Register />;
}
