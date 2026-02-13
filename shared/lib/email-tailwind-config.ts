// Tailwind config for React Email (<Tailwind config={...} />)
// This mirrors the design tokens defined in app/globals.css.
// Note: Email clients have limited CSS support; prefer simple color values.

export const emailTailwindConfig = {
  theme: {
    extend: {
      colors: {
        // Derived from app/globals.css tokens (approximate, email-safe values)
        background: "#ffffff",
        foreground: "#0f172a",

        card: "#ffffff",
        "card-foreground": "#0f172a",

        popover: "#ffffff",
        "popover-foreground": "#0f172a",

        primary: "oklch(0.488 0.243 264.376)",
        "primary-foreground": "#f8fafc",

        secondary: "#f8fafc",
        "secondary-foreground": "#111827",

        muted: "#f1f5f9",
        "muted-foreground": "#64748b",

        accent: "#f1f5f9",
        "accent-foreground": "#111827",

        destructive: "#dc2626",

        border: "#e2e8f0",
        input: "#e2e8f0",
        ring: "#94a3b8",
      },
      borderRadius: {
        // globals.css: --radius: 0.625rem
        sm: "calc(0.625rem - 4px)",
        md: "calc(0.625rem - 2px)",
        lg: "0.625rem",
      },
      fontFamily: {
        // globals.css uses CSS variables; emails should use robust fallbacks
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "Noto Sans",
          "Apple Color Emoji",
          "Segoe UI Emoji",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
    },
  },
} as const;
