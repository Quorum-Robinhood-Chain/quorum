import type { Config } from "tailwindcss";

// Tailwind v4 config; colors/fonts mirror the CSS vars in :root.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lime: "#d2ff01",
        "lime-tint": "#f6fbe1",
        olive: "#5c7300",
        ink: "#0a0a0a",
        gray: {
          400: "#a3a3a3",
          600: "#737373",
        },
        line: "#e5e5e5", // named "line" (not "border") to avoid ambiguity with border-* utilities
        panel: "#fafafa",
        danger: "#b23b1f",
      },
      fontFamily: {
        display: ["var(--font-big-shoulders)", "sans-serif"],
        body: ["var(--font-public-sans)", "sans-serif"],
      },
      maxWidth: {
        site: "1240px",
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
