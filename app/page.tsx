import FeedPage from "@/feature/feed/components/feed-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed — Explore Ideas & Updates",
  description:
    "Discover the latest posts, ideas, projects, and updates from your team and the ZEV community. Share your thoughts and collaborate in real time.",
  openGraph: {
    title: "Feed — Explore Ideas & Updates | ZEV",
    description:
      "Discover the latest posts, ideas, projects, and updates from your team and the ZEV community.",
  },
};

export default function Page() {
  return <FeedPage />;
}
