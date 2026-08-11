import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter, JetBrains_Mono, Unbounded } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { NoiseOverlay } from "@/components/effects/NoiseOverlay";
import { siteConfig } from "@/data/site";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

// v0.3.0-alpha "Reimagined Design" — the new home page's large type (hero,
// big section headings, the CTA) moved off Fraunces onto Unbounded.
// Weight 400 ("Regular") is the default; 500 ("Medium") is used only for
// the "Про нас" heading per the brief, applied at the call site via
// font-medium rather than a second font instance.
const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="uk"
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} ${unbounded.variable}`}
    >
      <body className="bg-graphite font-sans text-bone antialiased">
        <NoiseOverlay />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
