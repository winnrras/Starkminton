import { heroui } from "@heroui/react";
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        ink: {
          950: "#0a0b0f",
          900: "#111318",
          800: "#1a1d24",
          700: "#272b35",
          600: "#3a3f4b",
        },
        accent: {
          DEFAULT: "#d9ff3f",
          dim: "#a8c72f",
        },
      },
      animation: {
        "pulse-dot": "pulseDot 1.2s ease-out",
        "fade-up": "fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        pulseDot: {
          "0%": { transform: "scale(0.4)", opacity: "1" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
        fadeUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  darkMode: "class",
  plugins: [
    // @ts-expect-error - heroui plugin type mismatch with Tailwind
    heroui({
      themes: {
        dark: {
          colors: {
            background: "#0a0b0f",
            foreground: "#f5f5f4",
            primary: {
              DEFAULT: "#d9ff3f",
              foreground: "#0a0b0f",
            },
          },
        },
      },
    }),
  ],
};

export default config;
