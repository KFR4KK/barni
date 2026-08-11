"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProjectImage } from "@prisma/client";
import { buildProjectMedia, type ProjectMediaItem } from "@/lib/project-media";
import { cn, isExternalUrl } from "@/lib/utils";

interface ProjectGalleryProps {
  coverImage: string | null;
  images: ProjectImage[];
  /** Used as the alt text for the cover slide, and as a fallback alt for
   * any gallery image that was never given its own. */
  title: string;
  className?: string;
}

// One slide's actual media. A `switch` on `item.type`, not an if/else —
// see ProjectMediaItem's own comment in lib/project-media.ts: adding a
// new media type later is a compile error here until this switch grows
// a matching case, which is the point of making it a discriminated
// union instead of always assuming "image".
function ProjectMediaSlide({ item, priority }: { item: ProjectMediaItem; priority: boolean }) {
  switch (item.type) {
    case "image":
      return (
        <Image
          src={item.url}
          alt={item.alt}
          fill
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
          unoptimized={isExternalUrl(item.url)}
          priority={priority}
        />
      );
  }
}

// Phase 11 — Project Media Gallery. Replaces the old static grid
// (Phase 6.3) with an inline slider: the cover image and every gallery
// image now live in one slide list (see buildProjectMedia) and share a
// single, fixed-aspect-ratio container — no lightbox, no separate route,
// all navigation happens in place, per the brief.
export function ProjectGallery({ coverImage, images, title, className }: ProjectGalleryProps) {
  const media = useMemo(
    () => buildProjectMedia(coverImage, images, title),
    [coverImage, images, title]
  );
  const [index, setIndex] = useState(0);
  const hasMultiple = media.length > 1;

  // Wraps around at both ends (going "→" from the last slide lands back
  // on the first, and vice versa) rather than disabling the arrows at
  // the edges — a small kindness for a 2–3 image gallery, and it means
  // the arrow buttons never need a disabled state.
  const goTo = useCallback(
    (next: number) => {
      if (media.length === 0) return;
      setIndex(((next % media.length) + media.length) % media.length);
    },
    [media.length]
  );

  if (media.length === 0) return null;

  return (
    <div
      className={cn(
        "relative aspect-[16/9] w-full overflow-hidden rounded-card border border-line/60 bg-graphite",
        className
      )}
      role={hasMultiple ? "region" : undefined}
      aria-roledescription={hasMultiple ? "carousel" : undefined}
      aria-label={hasMultiple ? title : undefined}
      tabIndex={hasMultiple ? 0 : undefined}
      onKeyDown={(event) => {
        if (!hasMultiple) return;
        if (event.key === "ArrowLeft") goTo(index - 1);
        if (event.key === "ArrowRight") goTo(index + 1);
      }}
    >
      {/* Point 6 — smooth translate transition between slides, no hard
          cut. Point 7 — this row is the only thing that moves; the
          outer container's aspect ratio (and therefore the card's
          height) never changes, whether the gallery has 1 slide or 10. */}
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {media.map((item, i) => (
          <div key={item.id} className="relative h-full w-full shrink-0">
            <ProjectMediaSlide item={item} priority={i === 0} />
          </div>
        ))}
      </div>

      {/* Points 5/8/9 — arrows + dots share one pill, only rendered at
          all once there's more than one slide to navigate between. */}
      {hasMultiple && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-charcoal/70 px-3 py-2 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Попередній слайд"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-bone transition-colors duration-fast hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1.5">
            {media.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Слайд ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-fast",
                  i === index ? "w-4 bg-bone" : "w-1.5 bg-bone/40 hover:bg-bone/70"
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Наступний слайд"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-bone transition-colors duration-fast hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
