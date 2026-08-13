import { SearchX } from "lucide-react";

interface ProjectsSearchEmptyStateProps {
  query: string;
  onClear: () => void;
}

export function ProjectsSearchEmptyState({ query, onClear }: ProjectsSearchEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <SearchX size={28} className="text-ash" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="font-display text-xl font-normal lowercase text-bone">Нічого не знайдено</p>
        <p className="font-sans text-sm text-ash">
          За запитом «{query}» нічого немає. Спробуй інше формулювання.
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="rounded-full border border-line px-6 py-2.5 font-sans text-sm text-bone transition-colors duration-fast hover:border-brass hover:text-brass"
      >
        Очистити пошук
      </button>
    </div>
  );
}
