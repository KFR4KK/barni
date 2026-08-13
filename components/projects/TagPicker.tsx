"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formLabelClasses, formFieldClasses } from "@/lib/form-styles";
import { MAX_TAGS_PER_PROJECT, MAX_CUSTOM_TAG_LENGTH, type TagOption } from "@/lib/tags";

// Phase 10 — Tags.
//
// A picked tag is either a real TagOption (built-in, or — on the edit
// form — one of this project's already-existing custom tags) or a
// "staged" one: a custom-tag name the user just typed and confirmed via
// "Створити власний тег", which doesn't have a real Tag.id yet. Staged
// tags are marked with `isStaged: true` and a locally-unique `id`
// (`staged:<n>`) purely so React has a stable key and ProjectForm can
// tell the two apart when building its submit payload (`tagIds` for
// real ones, `customTagNames` for staged ones — see that component).
export interface PickedTag {
  id: string;
  name: string;
  isBuiltIn: boolean;
  isStaged?: boolean;
}

interface TagPickerProps {
  /** Null on the create form before the project has ever been saved —
   * search then only returns built-in matches (see searchTags' own
   * comment), which is fine since no custom tag can exist yet anyway. */
  projectId: string | null;
  selected: PickedTag[];
  onChange: (tags: PickedTag[]) => void;
  disabled?: boolean;
}

let stagedIdCounter = 0;

export function TagPicker({ projectId, selected, onChange, disabled }: TagPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TagOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const atLimit = selected.length >= MAX_TAGS_PER_PROJECT;

  // Search-as-you-type: fires on every keystroke (debounced) rather than
  // waiting for a form submit or explicit "search" action, per the
  // brief's "пошук повинен працювати одразу при вводі тексту". A short
  // debounce (150ms) is still needed so ten keystrokes in a row don't
  // fire ten requests — indistinguishable from "immediate" to a person
  // typing, but far cheaper.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (projectId) params.set("projectId", projectId);
        const response = await fetch(`/api/tags/search?${params.toString()}`);
        if (!response.ok) throw new Error(`Search failed: ${response.status}`);
        const data: { tags: TagOption[] } = await response.json();
        if (!cancelled) setResults(data.tags);
      } catch (error) {
        console.error("[tag-picker] search failed:", error);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, projectId, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedIds = new Set(selected.map((tag) => tag.id));
  const selectedNames = new Set(selected.map((tag) => tag.name.toLowerCase()));
  const visibleResults = results.filter((tag) => !selectedIds.has(tag.id));

  const trimmedQuery = query.trim();
  const hasExactMatch =
    trimmedQuery.length > 0 &&
    (visibleResults.some((tag) => tag.name.toLowerCase() === trimmedQuery.toLowerCase()) ||
      selectedNames.has(trimmedQuery.toLowerCase()));
  const canCreateCustom =
    trimmedQuery.length > 0 &&
    trimmedQuery.length <= MAX_CUSTOM_TAG_LENGTH &&
    !hasExactMatch &&
    !atLimit;

  function addTag(tag: TagOption) {
    if (atLimit || selectedIds.has(tag.id)) return;
    onChange([...selected, { id: tag.id, name: tag.name, isBuiltIn: tag.isBuiltIn }]);
    setQuery("");
    setResults([]);
  }

  function addCustomTag() {
    if (!canCreateCustom) return;
    stagedIdCounter += 1;
    onChange([
      ...selected,
      { id: `staged:${stagedIdCounter}`, name: trimmedQuery, isBuiltIn: false, isStaged: true },
    ]);
    setQuery("");
    setResults([]);
  }

  function removeTag(id: string) {
    onChange(selected.filter((tag) => tag.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="tag-picker-input" className={formLabelClasses}>
        Теги проєкту
      </label>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((tag) => (
            <li
              key={tag.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-sans text-xs",
                tag.isBuiltIn
                  ? "border-line text-bone"
                  : "border-brass/40 bg-brass/5 text-brass"
              )}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                disabled={disabled}
                aria-label={`Прибрати тег ${tag.name}`}
                className="text-ash transition-colors duration-fast hover:text-brass disabled:opacity-60"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div ref={containerRef} className="relative">
        <input
          id="tag-picker-input"
          type="text"
          value={query}
          disabled={disabled || atLimit}
          placeholder={atLimit ? `Максимум ${MAX_TAGS_PER_PROJECT} тегів` : "Пошук тегів…"}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
          className={formFieldClasses}
        />

        {isOpen && !atLimit && (query.trim().length > 0 || visibleResults.length > 0) && (
          <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-64 overflow-y-auto rounded-md border border-line bg-charcoal shadow-card">
            {visibleResults.length > 0 && (
              <ul className="divide-y divide-line/40">
                {visibleResults.map((tag) => (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onClick={() => addTag(tag)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left font-sans text-sm text-bone transition-colors duration-fast hover:bg-graphite"
                    >
                      {tag.name}
                      {!tag.isBuiltIn && (
                        <span className="font-sans text-[10px] uppercase tracking-wider text-brass/80">
                          свій
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {isSearching && visibleResults.length === 0 && (
              <p className="px-4 py-3 font-sans text-sm text-ash/70">Пошук…</p>
            )}

            {!isSearching && canCreateCustom && (
              <button
                type="button"
                onClick={addCustomTag}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans text-xs uppercase tracking-wider text-brass transition-colors duration-fast hover:bg-graphite"
              >
                + Створити власний тег «{trimmedQuery}»
              </button>
            )}

            {!isSearching && visibleResults.length === 0 && !canCreateCustom && trimmedQuery && (
              <p className="px-4 py-3 font-sans text-sm text-ash/70">Нічого не знайдено</p>
            )}
          </div>
        )}
      </div>

      <p className="font-sans text-[10px] text-ash/70">
        {selected.length}/{MAX_TAGS_PER_PROJECT}. Власні теги видно лише на цьому проєкті.
      </p>
    </div>
  );
}
