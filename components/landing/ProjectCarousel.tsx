"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import type { ProjectListItem } from "@/lib/projects";

interface ProjectCarouselProps {
  projects: ProjectListItem[];
}

// Plain scroll-snap + scrollBy — no carousel library. The row itself is
// natively scrollable (touch/trackpad/mousewheel all just work); the two
// arrow buttons are a convenience on top of that, not a requirement for
// the carousel to function, so nothing here breaks if JS is slow to
// hydrate.
export function ProjectCarousel({ projects }: ProjectCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-carousel-card]");
    const step = (card?.offsetWidth ?? 320) + 20; // card width + gap-5
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
      >
        {projects.map((project) => (
          <div key={project.id} data-carousel-card>
            <ProjectCard project={project} variant="landing" />
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          aria-label="Попередні проєкти"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-bone transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          aria-label="Наступні проєкти"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-bone transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
