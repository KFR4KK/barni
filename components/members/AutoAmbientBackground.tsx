"use client";

// Isolated client boundary, same principle as NoiseOverlay, AwardsSection,
// and ProfileContent: the profile page itself stays a server component, and
// only this small opt-in fallback needs the browser.

import { useEffect, useState } from "react";
import { AmbientLayer } from "@/components/members/AmbientLayer";
import type { AmbientPalette } from "@/data/types";

interface AutoAmbientBackgroundProps {
  avatarSrc: string;
}

const SAMPLE_SIZE = 24; // tiny offscreen canvas — this is an average-color
// sample, not a rendering, so there's no benefit to anything larger.

function averageColor(data: Uint8ClampedArray, size: number, y0: number, y1: number): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }

  const toHex = (sum: number) => Math.round(sum / count).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Runs once, after the avatar image is already loaded, on a 24×24 offscreen
// canvas — cheap enough to be a non-event on the main thread. Fails silently
// (no glow, just the plain dark background) if anything goes wrong: this is
// pure atmosphere, never load-bearing for the page to look complete.
export function AutoAmbientBackground({ avatarSrc }: AutoAmbientBackgroundProps) {
  const [palette, setPalette] = useState<AmbientPalette | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = avatarSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

        if (!cancelled) {
          setPalette({
            primary: averageColor(data, SAMPLE_SIZE, 0, Math.floor(SAMPLE_SIZE / 2)), // upper half
            secondary: averageColor(data, SAMPLE_SIZE, Math.floor(SAMPLE_SIZE / 2), SAMPLE_SIZE), // lower half
            accent: averageColor(data, SAMPLE_SIZE, 0, SAMPLE_SIZE), // whole-image average
          });
        }
      } catch {
        // A tainted or unreadable canvas just means no auto glow — the page
        // still looks complete without it.
      }
    };

    return () => {
      cancelled = true;
    };
  }, [avatarSrc]);

  if (!palette) return null;

  return <AmbientLayer palette={palette} />;
}
