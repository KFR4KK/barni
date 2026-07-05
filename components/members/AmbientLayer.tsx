import type { AmbientPalette } from "@/data/types";

interface AmbientLayerProps {
  palette: AmbientPalette;
}

// Purely presentational — no hooks, no "use client" needed — so the
// server-rendered manual-palette path (AmbientBackground) and the
// client-side auto-extracted fallback (AutoAmbientBackground) can share
// the exact same visual output and stay in sync if this ever changes.
//
// Three soft radial gradients standing in for "leaking light" rather than
// a flat tint. Colors fade to fully transparent well before the edge of
// their radius, which gives the blurred-light look without an actual blur
// filter (cheap: no filter, no canvas, just background-image + a slow
// CSS-only animation that `prefers-reduced-motion` already neutralizes
// globally in globals.css).
export function AmbientLayer({ palette }: AmbientLayerProps) {
  const { primary, secondary, accent } = palette;

  return (
    <div
      aria-hidden="true"
      className="animate-ambient-drift absolute inset-0"
      style={{
        backgroundImage: `
          radial-gradient(50% 45% at 18% 20%, ${primary} 0%, transparent 65%),
          radial-gradient(55% 50% at 78% 60%, ${secondary} 0%, transparent 72%),
          radial-gradient(45% 40% at 45% 92%, ${accent} 0%, transparent 75%)
        `,
      }}
    />
  );
}
