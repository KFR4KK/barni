"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectGallerySort } from "@/lib/projects";

interface ProjectsFilterMenuProps {
  value: ProjectGallerySort;
  onChange: (sort: ProjectGallerySort) => void;
}

// See lib/projects.ts's own comment on ProjectGallerySort for why this
// is four options, not the original brief's six — "All"/"Recent" and
// "Popular"/"Trending" were each two labels for one identical behavior.
const FILTERS: { value: ProjectGallerySort; label: string }[] = [
  { value: "recent", label: "Все" },
  { value: "trending", label: "У тренді" },
  { value: "mostLiked", label: "Найбільше вподобань" },
  { value: "mostViewed", label: "Найбільше переглядів" },
];

// A single "Filters" button + dropdown, per the Figma mockup — replaces
// the earlier inline filter-pills row. Same open/close + outside-click/
// Escape pattern components/notifications/NotificationDropdown.tsx and
// components/auth/UserMenu.tsx already use, rather than a third
// dropdown implementation.
export function ProjectsFilterMenu({ value, onChange }: ProjectsFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 font-sans text-sm text-ash transition-colors duration-fast hover:border-brass/40 hover:text-bone"
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
        фільтри
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-charcoal py-1.5 shadow-card"
        >
          {FILTERS.map((filter) => {
            const isActive = value === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onChange(filter.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left font-sans text-sm transition-colors duration-fast",
                  isActive ? "text-bone" : "text-ash hover:text-bone"
                )}
              >
                {filter.label}
                {isActive && <Check size={14} className="text-brass" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
