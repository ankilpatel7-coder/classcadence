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
        // Primary anchor — Emerald to match the brand mark.
        primary: {
          DEFAULT: "#1AA876",    // Brand Emerald
          soft: "#D6F4E5",       // Light wash
          strong: "#0B6845",     // Deep emerald
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
        // Card: subtle outer + soft far-shadow + 1px inner highlight at top.
        card: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -12px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.7)",
        // Pop: dropdowns, modals, banners.
        pop: "0 12px 40px -12px rgba(15,23,42,0.22), 0 4px 12px -4px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.7)",
        // Emboss: raised button look — outer shadow + light edge highlight + dark bottom edge.
        emboss:
          "0 1px 2px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(15,23,42,0.06)",
        // Press: inset for inputs (pressed-into-the-surface feel).
        press: "inset 0 2px 4px rgba(15,23,42,0.06)",
        // Lift: on hover, slightly larger shadow.
        lift: "0 2px 4px rgba(15,23,42,0.06), 0 18px 36px -12px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.7)",
        // Glow: focus ring fallback / accent.
        glow: "0 0 0 4px rgba(30,58,138,0.12)",
      },
      // 8px baseline grid: defaults already match. Use space-{1..10}.
    },
  },
  plugins: [],
};

export default config;
