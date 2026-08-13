import { cn } from "@/lib/utils";
import type { ProjectGallerySort } from "@/lib/projects";

interface ProjectsFiltersProps {
  value: ProjectGallerySort;
  onChange: (sort: ProjectGallerySort) => void;
}

// See lib/projects.ts's own comment on ProjectGallerySort for why this
// is four options, not the brief's original six — "All"/"Recent" and
// "Popular"/"Trending" were each two labels for one behavior.
const FILTERS: { value: ProjectGallerySort; label: string }[] = [
  { value: "recent", label: "Все" },
  { value: "trending", label: "У тренді" },
  { value: "mostLiked", label: "Найбільше вподобань" },
  { value: "mostViewed", label: "Найбільше переглядів" },
];

export function ProjectsFilters({ value, onChange }: ProjectsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Сортування проєктів">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          role="tab"
          aria-selected={value === filter.value}
          onClick={() => onChange(filter.value)}
          className={cn(
            "rounded-full border px-4 py-1.5 font-sans text-sm transition-colors duration-fast",
            value === filter.value
              ? "border-brass bg-brass/10 text-brass"
              : "border-line text-ash hover:border-brass/40 hover:text-bone"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
