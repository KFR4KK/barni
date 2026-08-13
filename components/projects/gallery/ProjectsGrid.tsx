import { GalleryProjectCard } from "@/components/projects/gallery/GalleryProjectCard";
import type { ClientProjectGalleryItem } from "@/components/projects/gallery/types";

interface ProjectsGridProps {
  projects: ClientProjectGalleryItem[];
}

// Masonry via CSS multi-column layout (`columns-*`), not a JS masonry
// library. A column-based layout naturally lets each card keep its
// cover image's own height — the brief's "square/horizontal/vertical"
// variety — with zero measurement or a re-layout pass on image load,
// which is what every JS masonry approach needs to avoid a flash of
// wrong positions. The one thing CSS columns can't do that true
// Pinterest-style masonry can is guarantee left-to-right reading order
// (columns fill top-to-bottom, then move right) — acceptable for a
// "browse and discover" gallery where scan order isn't load-bearing
// information, unlike e.g. a step-by-step list.
export function ProjectsGrid({ projects }: ProjectsGridProps) {
  return (
    <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6">
      {projects.map((project) => (
        <GalleryProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
