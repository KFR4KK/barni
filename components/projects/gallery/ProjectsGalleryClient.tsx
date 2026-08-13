"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { ProjectsSearchBar } from "@/components/projects/gallery/ProjectsSearchBar";
import { ProjectsFilters } from "@/components/projects/gallery/ProjectsFilters";
import { ProjectsGrid } from "@/components/projects/gallery/ProjectsGrid";
import { ProjectsEmptyState } from "@/components/projects/gallery/ProjectsEmptyState";
import { ProjectsSearchEmptyState } from "@/components/projects/gallery/ProjectsSearchEmptyState";
import { useInfiniteScroll } from "@/components/projects/gallery/useInfiniteScroll";
import type { ClientProjectGalleryItem } from "@/components/projects/gallery/types";
import type { ProjectGallerySort } from "@/lib/projects";

interface ProjectsGalleryClientProps {
  initialProjects: ClientProjectGalleryItem[];
  initialHasMore: boolean;
}

const SEARCH_DEBOUNCE_MS = 350;

export function ProjectsGalleryClient({ initialProjects, initialHasMore }: ProjectsGalleryClientProps) {
  const [sort, setSort] = useState<ProjectGallerySort>("recent");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [projects, setProjects] = useState<ClientProjectGalleryItem[]>(initialProjects);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  // Debounce the search box -> the actual query that triggers a fetch,
  // so someone typing "landing page" doesn't fire four separate requests
  // for "l", "la", "lan"... A plain setTimeout, not a dependency, for the
  // same "avoid unnecessary dependencies" reasoning the rest of this
  // app's auth/landing work already followed.
  useEffect(() => {
    const timeout = setTimeout(() => setActiveSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Fetches page 0 fresh whenever sort or the (debounced) search changes
  // — a new filter is a new result set, not something to append to.
  // Skips on first mount since the server already rendered page 0 for
  // the default sort/no-search case (see app/projects/page.tsx).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setPage(0);

    const params = new URLSearchParams({ page: "0", sort });
    if (activeSearch) params.set("q", activeSearch);

    fetch(`/api/projects?${params}`)
      .then((res) => res.json())
      .then((data: { items: ClientProjectGalleryItem[]; hasMore: boolean }) => {
        if (cancelled) return;
        setProjects(data.items);
        setHasMore(data.hasMore);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sort, activeSearch]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    setIsLoading(true);

    const params = new URLSearchParams({ page: String(nextPage), sort });
    if (activeSearch) params.set("q", activeSearch);

    fetch(`/api/projects?${params}`)
      .then((res) => res.json())
      .then((data: { items: ClientProjectGalleryItem[]; hasMore: boolean }) => {
        setProjects((prev) => [...prev, ...data.items]);
        setHasMore(data.hasMore);
        setPage(nextPage);
      })
      .finally(() => setIsLoading(false));
  }, [isLoading, hasMore, page, sort, activeSearch]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !isLoading);

  const isSearching = activeSearch.length > 0;
  const showSearchEmptyState = isSearching && !isLoading && projects.length === 0;
  const showEmptyState = !isSearching && !isLoading && projects.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ProjectsFilters value={sort} onChange={setSort} />
        <ProjectsSearchBar value={searchInput} onChange={setSearchInput} />
      </div>

      {showSearchEmptyState ? (
        <ProjectsSearchEmptyState
          query={activeSearch}
          onClear={() => {
            setSearchInput("");
            setActiveSearch("");
          }}
        />
      ) : showEmptyState ? (
        <ProjectsEmptyState />
      ) : (
        <>
          <ProjectsGrid projects={projects} />
          <div ref={sentinelRef} className="flex justify-center py-8">
            {isLoading && <Loader2 size={20} className="animate-spin text-ash" aria-hidden="true" />}
          </div>
        </>
      )}
    </div>
  );
}
