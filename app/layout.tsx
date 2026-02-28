import type { Metadata } from "next";
import { Outfit, Merriweather, Fira_Code } from "next/font/google";
import "./globals.css";
import "react-photo-view/dist/react-photo-view.css";
import { Toaster } from "@/shared/shadcn/components/ui/sonner";
import ClientLayout from "@/layout/client-layout";
import { TooltipProvider } from "@/shared/shadcn/components/ui/tooltip";
import { SessionProvider } from "next-auth/react";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontSerif = Merriweather({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ZEV | Your Team Communication Hub",
    template: "%s | ZEV",
  },
  description:
    "ZEV is the easiest way for teams and companies to chat, collaborate, and stay connected. Enjoy real-time messaging, organized channels, file sharing, and AI-powered tools — all in one place.",
  keywords: [
    "zev",
    "zev Nexus",
    "Yuzen",
    "team chat",
    "team communication",
    "business messaging",
    "workplace chat",
    "team collaboration",
    "real-time messaging",
    "group chat",
    "company communication",
    "channel messaging",
    "developer chat",
    "slack alternative",
    "discord for teams",
    "team messaging app",
    "enterprise chat",
    "remote team communication",
  ],
  authors: [{ name: "Yuzen" }],
  creator: "Yuzen",
  publisher: "Yuzen",
  applicationName: "ZEV",
  category: "Communication",
  icons: {
    icon: [
      { url: "/icons/zev-icon-apple-Dark.ico", sizes: "any" },
      {
        url: "/icons/zev-icon-apple-iOS-Dark.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
    apple: "/icons/zev-icon-apple-iOS-Dark.png",
    shortcut: "/icons/zev-icon-apple-Dark.ico",
  },
  openGraph: {
    type: "website",
    siteName: "ZEV",
    title: "ZEV | Your Team Communication Hub",
    description:
      "ZEV is the easiest way for teams and companies to chat, collaborate, and stay connected. Real-time messaging, organized channels, file sharing, and AI-powered tools.",
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: "/icons/logo-with-text-light-removebg.png",
        width: 1200,
        height: 630,
        alt: "ZEV — Team Communication Hub",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZEV | Your Team Communication Hub",
    description:
      "ZEV is the easiest way for teams and companies to chat, collaborate, and stay connected. Real-time messaging, channels, file sharing & AI tools.",
    images: ["/icons/logo-with-text-light-removebg.png"],
    creator: "@ZEV",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "ZEV",
    url: SITE_URL,
    description:
      "Real-time messaging, organized channels, file sharing, and AI-powered tools for teams and companies.",
    applicationCategory: "CommunicationApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    creator: {
      "@type": "Organization",
      name: "ZEV",
      url: SITE_URL,
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}
      >
        <TooltipProvider>
          <SessionProvider>
            <ClientLayout>{children}</ClientLayout>
            <Toaster />
          </SessionProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
