import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F8F9FB",
        ink: "#18181B",
        muted: "#52525B",
        faint: "#71717A",
        line: "#E4E4E7",
        primary: {
          DEFAULT: "#962D46",
          hover: "#7D2339",
          active: "#641B2D",
          fixed: "#ffd9dd",
        },
        success: { DEFAULT: "#15803D", bg: "#ECFDF5" },
        warning: { DEFAULT: "#B45309", bg: "#FFFBEB" },
        danger: { DEFAULT: "#B91C1C", bg: "#FEF2F2" },
        info: { DEFAULT: "#1D4ED8", bg: "#EFF6FF" },
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "Nunito Sans", "sans-serif"],
      },
      borderRadius: {
        control: "4px",
        container: "6px",
      },
      boxShadow: {
        float: "0 4px 12px rgba(24, 24, 27, 0.06)",
      },
      maxWidth: {
        reading: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
