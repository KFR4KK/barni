"use client";

import { X } from "lucide-react";

interface ProjectsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

// Controlled input — debouncing happens one level up in
// ProjectsGalleryClient (where the actual fetch is triggered), not here,
// so this component stays a plain, easily-testable input. Matches the
// provided Figma mockup: no leading icon, wide centered pill, plain
// lowercase "пошук" placeholder — search is still by title/author/tag,
// the placeholder just doesn't spell that out the way the previous
// version did.
export function ProjectsSearchBar({ value, onChange }: ProjectsSearchBarProps) {
  return (
    <div className="relative w-full max-w-xl">
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="пошук"
        aria-label="Пошук проєктів за назвою, автором або тегом"
        className="w-full rounded-full border border-line bg-graphite py-3 pl-6 pr-10 font-sans text-sm text-bone placeholder:text-ash/70 focus:border-brass focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Очистити пошук"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-ash transition-colors duration-fast hover:text-bone"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
