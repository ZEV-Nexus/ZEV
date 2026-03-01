"use client";
import React from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { cn } from "../shadcn/lib/utils";
type LogoImageProps = {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
};
export default function LogoImage({
  size = "md",
  withText = false,
}: LogoImageProps) {
  const { theme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const imageSrc = isDark
    ? withText
      ? "/icons/zev-icon-text-dark.png"
      : "/icons/zev-icon-dark.png"
    : withText
      ? "/icons/zev-icon-text-light.png"
      : "/icons/zev-icon-light.png";
  return (
    <Image
      src={imageSrc}
      alt="Chat.to Logo"
      width={100}
      height={32}
      className={cn(
        "   object-cover rounded-md",
        withText ? "aspect-video" : "aspect-square",
        !withText && {
          "w-6": size === "sm",
          "w-8": size === "md",
          "w-12": size === "lg",
        },
      )}
    />
  );
}
