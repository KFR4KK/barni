import Link from "next/link";
import { Heart, Eye, MessageCircle, ImageOff } from "lucide-react";
import type { ClientProjectGalleryItem } from "@/components/projects/gallery/types";

interface GalleryProjectCardProps {
  project: ClientProjectGalleryItem;
}

// Deliberately a plain <img>, not next/image, here specifically — masonry
// needs each card's real height to come from its cover image's own
// natural aspect ratio, which varies project to project. next/image's
// non-fill mode requires fixed width/height (which would force every
// card to the same shape, defeating masonry entirely), and its `fill`
// mode needs a sized parent, which is exactly what we don't have ahead
// of time here. This does lose next/image's automatic format/CDN
// resizing — an acceptable trade for a page whose whole point is
// variable-height cards; revisit if/when cover images start storing
// their own width/height (letting next/image size correctly upfront).
export function GalleryProjectCard({ project }: GalleryProjectCardProps) {
  const authorName = project.author.displayName || project.author.username || "Учасник";

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group relative mb-4 block break-inside-avoid overflow-hidden rounded-2xl bg-charcoal transition-transform duration-base focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 motion-safe:hover:-translate-y-0.5"
    >
      {project.coverImage ? (
        <img
          src={project.coverImage}
          alt=""
          loading="lazy"
          decoding="async"
          className="block w-full h-auto object-cover transition-transform duration-slow motion-safe:group-hover:scale-[1.04]"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-graphite">
          <ImageOff size={22} className="text-ash/50" aria-hidden="true" />
        </div>
      )}

      {/* Hover overlay — a gradient + fade-in, no heavier effect. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-1 bg-gradient-to-t from-graphite/90 via-graphite/10 to-transparent p-4 opacity-0 transition-opacity duration-base motion-safe:group-hover:opacity-100">
        <p className="truncate font-display text-sm font-normal lowercase text-bone">{project.title}</p>
        <div className="flex items-center gap-3 font-sans text-xs text-ash">
          <span className="truncate">{authorName}</span>
          <span className="ml-auto flex shrink-0 items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Heart size={12} aria-hidden="true" />
              {project.likesCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye size={12} aria-hidden="true" />
              {project.viewCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle size={12} aria-hidden="true" />
              {project.commentsCount}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
