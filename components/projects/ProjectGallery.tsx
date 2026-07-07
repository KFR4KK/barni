import Image from "next/image";
import type { ProjectImage } from "@prisma/client";
import { isExternalUrl } from "@/lib/utils";

interface ProjectGalleryProps {
  images: ProjectImage[];
}

// Phase 6.3 — Project Gallery. Deliberately plain, per the brief ("не
// делать сложный просмотрщик... обычная адаптивная сетка"): no lightbox,
// no carousel, no captions rendered (alt is stored on the model for a
// future pass — see ProjectImage's comment in prisma/schema.prisma —
// but this phase never sets it, so there's nothing meaningful to show
// here yet). Renders nothing at all when the gallery is empty, so
// pre-6.3 projects render exactly as before (brief, point 4).
export function ProjectGallery({ images }: ProjectGalleryProps) {
  if (images.length === 0) return null;

  return (
    <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
      {images.map((image) => (
        <div
          key={image.id}
          className="relative aspect-square overflow-hidden rounded-card border border-line/60 bg-graphite"
        >
          <Image
            src={image.imageUrl}
            alt={image.alt ?? ""}
            fill
            sizes="(min-width: 768px) 240px, 45vw"
            className="object-cover"
            unoptimized={isExternalUrl(image.imageUrl)}
          />
        </div>
      ))}
    </div>
  );
}
