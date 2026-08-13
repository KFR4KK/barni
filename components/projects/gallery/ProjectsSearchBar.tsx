"use client";

import { Search, X } from "lucide-react";

interface ProjectsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

// Controlled input — debouncing happens one level up in
// ProjectsGalleryClient (where the actual fetch is triggered), not here,
// so this component stays a plain, easily-testable input.
export function ProjectsSearchBar({ value, onChange }: ProjectsSearchBarProps) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Пошук проєктів, авторів, тегів…"
        aria-label="Пошук проєктів"
        className="w-full rounded-full border border-line bg-graphite py-2.5 pl-10 pr-9 font-sans text-sm text-bone placeholder:text-ash/60 focus:border-brass focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Очистити пошук"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ash transition-colors duration-fast hover:text-bone"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
