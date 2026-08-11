import type { Config } from "tailwindcss";

// Color, radius and shadow values here are the code-level source of truth
// for the tokens defined in the approved creative direction document.
// Do not add new colors/shadows/blurs here without updating that document first.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: "rgb(var(--color-graphite) / <alpha-value>)", // primary background
        charcoal: "rgb(var(--color-charcoal) / <alpha-value>)", // elevated surfaces
        bone: "rgb(var(--color-bone) / <alpha-value>)", // primary text
        ash: "rgb(var(--color-ash) / <alpha-value>)", // secondary text / metadata
        brass: "rgb(var(--color-brass) / <alpha-value>)", // the one accent
        line: "rgb(var(--color-line) / <alpha-value>)", // hairline borders
      },
      fontFamily: {
        serif: ["var(--font-serif)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        // v0.3.0-alpha — Unbounded, used for the new home page's large type
        // only (hero, big headings, CTA). Every other page keeps `font-serif`.
        display: ["var(--font-display)", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        // the single soft elevation shadow described in the design system —
        // deliberately not a multi-step sm/md/lg/xl scale
        card: "0 20px 40px rgba(0, 0, 0, 0.35)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "250ms",
        slow: "500ms",
      },
      backdropBlur: {
        nav: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
