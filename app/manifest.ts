import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ZEV — Team Communication Hub",
    short_name: "ZEV",
    description:
      "Real-time messaging, organized channels, file sharing, and AI-powered tools for teams and companies.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait-primary",
    categories: ["business", "communication", "productivity"],
    icons: [
      {
        src: "/icons/zev-icon-apple-iOS-Dark.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icons/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
