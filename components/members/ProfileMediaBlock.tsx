"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { MediaType } from "@prisma/client";
import { isExternalUrl, cn } from "@/lib/utils";

export type ProfileMediaKind = MediaType;

interface ProfileMediaBlockProps {
  url: string;
  type: ProfileMediaKind;
  alt: string;
  className?: string;
  /** `fill`-style sizes hint, forwarded to next/image for the IMAGE/GIF
   * cases. Videos always render at their container's full size, so this
   * has no video equivalent to pass. */
  sizes?: string;
}

// Phase 12 — Profile Redesign. Shared by the banner (point 1) and the
// optional custom media widget (point 10) — both support the exact same
// three media kinds and the exact same behavior, so this is the one
// place that renders any of them rather than two near-duplicate
// components.
//
// Point 14 — Performance: video is muted+loop+playsInline+autoPlay
// (autoplay only works muted in every browser anyway, which conveniently
// matches the brief's own "muted" requirement) and pauses itself via
// IntersectionObserver the moment it scrolls out of view, resuming when
// it scrolls back in — "pause automatically when outside viewport" from
// the brief, point 1. `preload="metadata"` avoids downloading the whole
// clip just to show a static first frame for an off-screen banner.
export function ProfileMediaBlock({ url, type, alt, className, sizes }: ProfileMediaBlockProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            // Autoplay can still be blocked in some embedding contexts
            // even when muted (e.g. very aggressive browser settings) —
            // a failed play() here just leaves the poster frame showing,
            // never a thrown/unhandled rejection.
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  if (type === MediaType.VIDEO) {
    return (
      <video
        ref={videoRef}
        src={url}
        className={cn("h-full w-full object-cover", className)}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        aria-label={alt}
      />
    );
  }

  // IMAGE and GIF both render through next/image — `unoptimized` is
  // already required for a GIF regardless of host (Next's image
  // optimizer would otherwise flatten it to a static frame), so GIFs
  // always skip optimization; a plain IMAGE only skips it when it's an
  // external URL, same rule every other image on this site already
  // follows (see isExternalUrl's own callers).
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes ?? "100vw"}
      className={cn("object-cover", className)}
      unoptimized={type === MediaType.GIF || isExternalUrl(url)}
    />
  );
}
