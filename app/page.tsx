import FeedPage from "@/feature/feed/components/feed-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat.to - 動態牆",
  description: "分享你的想法、專案和靈感，與其他開發者交流",
};

export default function Page() {
  return <FeedPage />;
}
