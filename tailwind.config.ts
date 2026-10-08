import type { Config } from "tailwindcss";

// "Atelier Navy" palette — navy from the logo, warm linen neutrals, an oak
// accent, and muted earthy status colors. The default Tailwind scales below
// (gray/blue/green/red/amber/…) are overridden so existing classes re-theme.
const brand = {
  50: "#f3f6fb",
  100: "#e4eaf5",
  200: "#c9d5eb",
  300: "#a0b3d8",
  400: "#7189c0",
  500: "#4c68a6",
  600: "#1f3a73",
  700: "#172d5c",
  800: "#122349",
  900: "#0d1a37",
  950: "#081125",
};

const warmGray = {
  50: "#faf8f5",
  100: "#f3f0eb",
  200: "#e6e1d9",
  300: "#d3ccc1",
  400: "#998f82",
  500: "#746c61",
  600: "#5a544b",
  700: "#45403a",
  800: "#2e2a26",
  900: "#1c1a17",
  950: "#100f0d",
};

const oak = {
  50: "#fbf6ef",
  100: "#f5e9d8",
  200: "#ead2b0",
  300: "#dbb583",
  400: "#cb985c",
  500: "#b97f42",
  600: "#9d6634",
  700: "#7e502c",
  800: "#5f3d24",
  900: "#46301e",
};

const sage = {
  50: "#f1f6f1",
  100: "#dfeadf",
  200: "#c0d6c1",
  300: "#97bb9a",
  400: "#6c9d73",
  500: "#4f8a5b",
  600: "#3d7249",
  700: "#2f5a3a",
  800: "#26472f",
  900: "#1d3624",
};

const terracotta = {
  50: "#fbf2ef",
  100: "#f6e0d9",
  200: "#ecbfb2",
  300: "#e09d89",
  400: "#d47f69",
  500: "#c0563d",
  600: "#a64431",
  700: "#84372a",
  800: "#652b22",
  900: "#4a201a",
};

const ochre = {
  50: "#fbf6e9",
  100: "#f5e8c6",
  200: "#ead08b",
  300: "#ddb658",
  400: "#d3a43c",
  500: "#c8952a",
  600: "#a87a1f",
  700: "#85601a",
  800: "#66491a",
  900: "#4b3615",
};

const plum = {
  50: "#f7f2f6",
  100: "#ece0ea",
  200: "#d9c1d5",
  500: "#8a5a83",
  600: "#744a6e",
  700: "#5c3b58",
};

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand,
        oak,
        gray: warmGray,
        blue: brand,
        green: sage,
        red: terracotta,
        amber: ochre,
        yellow: ochre,
        orange: oak,
        purple: plum,
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "IBM Plex Sans Arabic", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
