import type { Metadata, Viewport } from "next";
import { Fraunces, Roboto, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Roboto — Google's canonical web font. Stands in for "Google Sans"
// (which isn't publicly available on Google Fonts). Used app-wide via
// the --font-ui CSS variable so existing Tailwind config keeps working.
const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
  weight: ["400", "500", "700", "900"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClassCadence — The rhythm of every great learning center.",
  description:
    "Multi-tenant student management for supplemental learning centers. Replace paper schedules, sticky-note attendance, and missed-class chaos with a steady, parent-trusted rhythm.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FBFAF7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-ui antialiased">{children}</body>
    </html>
  );
}
