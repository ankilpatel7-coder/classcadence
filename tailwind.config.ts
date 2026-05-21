import type { Config } from "tailwindcss";

// Brand tokens sourced from ClassCadence_BA_Document.docx, Section 3.5 & 3.11.
// Change tokens here first, then propagate through code.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary anchor
        primary: {
          DEFAULT: "#1E3A8A",    // Cadence Indigo
          soft: "#DBEAFE",       // Indigo Mist
          strong: "#172554",
        },
        success: {
          DEFAULT: "#16A34A",    // Bell Green — Present status
          soft: "#DCFCE7",
        },
        accent: {
          DEFAULT: "#F97316",    // Recess Orange — CTAs, badges
          soft: "#FFEDD5",
        },
        warning: "#F59E0B",      // Late Amber — Late status
        danger: "#EF4444",       // Absent Coral — Absent status
        bg: "#FBFAF7",           // Notebook Cream (lightened) — default app background
        surface: "#FFFFFF",
        ink: "#1F2937",          // Chalkboard — body text
        muted: "#6B7280",        // Eraser — secondary text
        line: "#E5E7EB",         // Border / hairline
      },
      fontFamily: {
        // Display = Inter (Sans). Used for all headlines and UI.
        display: ["var(--font-ui)", "system-ui", "-apple-system", "sans-serif"],
        // Wordmark = Fraunces (Serif). Used ONLY for the "ClassCadence" logo.
        wordmark: ["var(--font-display)", "Georgia", "serif"],
        ui: ["var(--font-ui)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "Menlo", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.06)",
        pop: "0 8px 24px rgba(15,23,42,0.12)",
      },
      // 8px baseline grid: defaults already match. Use space-{1..10}.
    },
  },
  plugins: [],
};

export default config;
