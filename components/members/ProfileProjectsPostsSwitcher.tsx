"use client";

import { useMemo, useState } from "react";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectsSection } from "@/components/projects/ProjectsSection";
import { PostsSection, type PostWithComments } from "@/components/posts/PostsSection";
import type { ProjectListItem } from "@/lib/projects";

type SortOrder = "newest" | "oldest" | "most-liked" | "alphabetical";

const SORT_LABELS: Record<SortOrder, string> = {
  newest: "Спочатку нові",
  oldest: "Спочатку старі",
  "most-liked": "Найбільше вподобань",
  alphabetical: "За алфавітом",
};

const SORT_ORDERS: SortOrder[] = ["newest", "oldest", "most-liked", "alphabetical"];

interface ProfileProjectsPostsSwitcherProps {
  projects: ProjectListItem[];
  posts: PostWithComments[];
  isOwner: boolean;
  viewer: { id: string } | null;
  viewerAvatarUrl?: string | null;
  viewerDisplayName?: string;
}

function sortProjects(projects: ProjectListItem[], order: SortOrder): ProjectListItem[] {
  const sorted = [...projects];
  switch (order) {
    case "newest":
      return sorted.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf());
    case "oldest":
      return sorted.sort((a, b) => a.createdAt.valueOf() - b.createdAt.valueOf());
    case "most-liked":
      return sorted.sort((a, b) => b.likesCount - a.likesCount);
    case "alphabetical":
      return sorted.sort((a, b) => a.title.localeCompare(b.title, "uk"));
  }
}

// Phase 12, points 7/8 — Projects/Posts Switch + Local Project Filters.
//
// Owns the one combined header the mockup shows ("проєкти / пости …
// фільтр пошуку") in place of ProjectsSection's/PostsSection's own
// separate headings (both suppressed here via `showHeading={false}` —
// see their own comments). Only one of the two sections is ever
// mounted at a time, driven by local `tab` state.
//
// The sort filter is explicitly client-side, in-memory, per-visitor
// state — per the brief's point 8 ("It must NOT change anything
// globally... this preference is temporary"): nothing here is persisted
// to the server, a URL, or even localStorage; reloading the page resets
// it to "newest", same as the tab itself. Only applies to Projects (the
// brief's point 8 is titled "Local *project* filters" — Posts has no
// sort control).
export function ProfileProjectsPostsSwitcher({
  projects,
  posts,
  isOwner,
  viewer,
  viewerAvatarUrl,
  viewerDisplayName,
}: ProfileProjectsPostsSwitcherProps) {
  const [tab, setTab] = useState<"projects" | "posts">("projects");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sortedProjects = useMemo(() => sortProjects(projects, sortOrder), [projects, sortOrder]);

  return (
    <section aria-label="Проєкти та пости">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 rounded-full border border-line/60 p-1">
          <button
            type="button"
            onClick={() => setTab("projects")}
            className={cn(
              "rounded-full px-4 py-1.5 font-display text-sm lowercase transition-colors duration-fast",
              tab === "projects" ? "bg-charcoal text-bone" : "text-ash hover:text-bone"
            )}
          >
            Проєкти
          </button>
          <span className="text-ash/50" aria-hidden="true">
            /
          </span>
          <button
            type="button"
            onClick={() => setTab("posts")}
            className={cn(
              "rounded-full px-4 py-1.5 font-display text-sm lowercase transition-colors duration-fast",
              tab === "posts" ? "bg-charcoal text-bone" : "text-ash hover:text-bone"
            )}
          >
            Пости
          </button>
        </div>

        {tab === "projects" && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSortOpen((current) => !current)}
              aria-haspopup="listbox"
              aria-expanded={isSortOpen}
              className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-wider text-ash transition-colors duration-fast hover:text-bone"
            >
              фільтр пошуку
              <ListFilter size={14} aria-hidden="true" />
            </button>

            {isSortOpen && (
              <>
                {/* Click-outside-to-close via a full-screen transparent
                    layer, same lightweight idiom as TagPicker's own
                    dropdown, rather than a document listener — this menu
                    is small/rare enough not to need it. */}
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setIsSortOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <ul
                  role="listbox"
                  className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-md border border-line bg-charcoal shadow-card"
                >
                  {SORT_ORDERS.map((order) => (
                    <li key={order}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={sortOrder === order}
                        onClick={() => {
                          setSortOrder(order);
                          setIsSortOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center px-4 py-2.5 text-left font-sans text-sm transition-colors duration-fast hover:bg-graphite",
                          sortOrder === order ? "text-brass" : "text-bone/90"
                        )}
                      >
                        {SORT_LABELS[order]}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-5">
        {tab === "projects" ? (
          <ProjectsSection projects={sortedProjects} isOwner={isOwner} showHeading={false} />
        ) : (
          <PostsSection
            posts={posts}
            isOwner={isOwner}
            viewer={viewer}
            viewerAvatarUrl={viewerAvatarUrl}
            viewerDisplayName={viewerDisplayName}
            showHeading={false}
          />
        )}
      </div>
    </section>
  );
}
