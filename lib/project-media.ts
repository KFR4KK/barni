import type { ProjectImage } from "@prisma/client";

// Phase 11 — Project Media Gallery.
//
// A discriminated union rather than ProjectGallery hard-coding "this is
// always an image" everywhere — per the brief, video support is coming
// later, and adding it should mean adding one new variant here (e.g.
// `{ id: string; type: "video"; url: string; alt: string; posterUrl?: string }`)
// plus one new case in ProjectGallery's slide renderer. Nothing about
// the slider mechanics itself (index state, arrows, dots, the
// transition) is aware of what a slide actually contains.
export type ProjectMediaItem = {
  id: string;
  type: "image";
  url: string;
  alt: string;
};

// Builds the slider's full, ordered slide list: the cover image is
// always slide 0 (per the brief — "Cover Image завжди має бути першим
// слайдом"), followed by the gallery images in their existing display
// order (see ProjectImage's `order` column / getProjectImages'
// orderBy). A project with no cover and an empty gallery yields `[]`,
// which ProjectGallery treats as "render nothing", same as before this
// phase.
export function buildProjectMedia(
  coverImage: string | null,
  images: Pick<ProjectImage, "id" | "imageUrl" | "alt">[],
  title: string
): ProjectMediaItem[] {
  const media: ProjectMediaItem[] = [];

  if (coverImage) {
    media.push({ id: "cover", type: "image", url: coverImage, alt: title });
  }
  for (const image of images) {
    media.push({ id: image.id, type: "image", url: image.imageUrl, alt: image.alt ?? title });
  }

  return media;
}
