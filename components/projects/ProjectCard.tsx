import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { Project } from "@prisma/client";
import { formatDate, isExternalUrl } from "@/lib/utils";

interface ProjectCardProps {
  project: Pick<
    Project,
    "slug" | "title" | "description" | "shortDescription" | "coverImage" | "visibility" | "createdAt"
  > & {
    // Phase 6.2 — added so the card can show a byline. Optional (rather
    // than required) so any existing caller that hasn't started passing
    // an author join yet still type-checks — see
    // lib/projects.ts's getProjectsByAuthorId, which is this card's only
    // current data source and does supply it.
    author?: { username: string; displayName: string | null };
    // Landing page's "landing" variant only — every ProjectListItem
    // already carries this (see lib/projects.ts's toProjectListItem),
    // it just wasn't rendered by either existing variant before now.
    likesCount?: number;
  };
  /**
   * Phase 9.3 — Feed Redesign (UI only). "default" (unset) renders
   * exactly what this component rendered before this phase — the
   * profile page's project grid (components/projects/ProjectsSection.tsx)
   * wasn't asked to change, so it keeps its original card treatment
   * byte-for-byte. "feed" is the taller-cover, more clearly "this is a
   * project, not a post" treatment app/feed/page.tsx asks for — same
   * component, same data, just a different set of classes and one small
   * "Проєкт" tag. "landing" is the landing page's carousel card — cover
   * on top, byline + like count on the bottom row.
   */
  variant?: "default" | "feed" | "landing";
}

// Phase 6.1 — deliberately built around only the fields every future
// consumer needs, not the full Project row, so it can be dropped into a
// profile's project grid (its first use here), and later into search
// results, a feed, or recommendations without changes — per the brief's
// "сделать её максимально универсальной".
//
// Phase 6.2 — now also shows a short description (falling back to the
// start of the full description when unset) and an author/date byline,
// matching this phase's brief for the card.
//
// Phase 9.3 — Feed Redesign. See `variant` above: nothing about what
// this card links to, fetches, or is built from has changed, only how
// it looks when `variant="feed"` is passed.
export function ProjectCard({ project, variant = "default" }: ProjectCardProps) {
  const isFeed = variant === "feed";
  const isLanding = variant === "landing";
  const excerpt = project.shortDescription || project.description;
  const authorName = project.author?.displayName || project.author?.username;

  // Landing page's featured-projects carousel — a fixed-width vertical
  // card (cover on top) sized to sit in a horizontal scroll row. Author
  // + like count share the bottom row since a visitor browsing the
  // carousel is scanning for "who made this / is it any good", not
  // reading the date.
  if (isLanding) {
    return (
      <Link
        href={`/projects/${project.slug}`}
        className="group flex w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] border border-line/60 bg-charcoal/40 shadow-card transition-colors duration-base hover:border-brass/50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 sm:w-[320px]"
      >
        <div className="relative aspect-[4/3] w-full shrink-0 bg-graphite">
          {project.coverImage && (
            <Image
              src={project.coverImage}
              alt=""
              fill
              sizes="(min-width: 640px) 320px, 280px"
              className="object-cover transition-transform duration-slow group-hover:scale-[1.03]"
              unoptimized={isExternalUrl(project.coverImage)}
            />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <h3 className="font-display text-base font-normal lowercase text-bone">{project.title}</h3>
          <p className="line-clamp-2 flex-1 font-sans text-sm text-ash/80">{excerpt}</p>
          <div className="flex items-center justify-between gap-3 pt-1">
            {authorName && <p className="truncate font-sans text-xs text-ash/70">{authorName}</p>}
            <span className="inline-flex shrink-0 items-center gap-1 font-sans text-xs text-ash/70">
              <Heart size={13} aria-hidden="true" />
              {project.likesCount ?? 0}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Phase 12 revision — the profile page's own card ("default") is now
  // the mockup's horizontal cover + info tile: a fixed-width cover on
  // the left, dark info panel on the right (date, title, short
  // description). The Feed's taller stacked treatment (`variant="feed"`)
  // is untouched below.
  if (!isFeed) {
    return (
      <Link
        href={`/projects/${project.slug}`}
        className="group flex h-40 overflow-hidden rounded-[28px] border border-line/60 bg-charcoal/40 transition-colors duration-base hover:border-brass/50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
      >
        <div className="relative w-2/5 shrink-0 bg-graphite">
          {project.coverImage && (
            <Image
              src={project.coverImage}
              alt=""
              fill
              sizes="(min-width: 768px) 20vw, 40vw"
              className="object-cover transition-transform duration-slow group-hover:scale-[1.03]"
              unoptimized={isExternalUrl(project.coverImage)}
            />
          )}
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1.5 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-sans text-xs text-ash/70">
              {formatDate(project.createdAt.toISOString())}
            </p>
            {project.visibility === "PRIVATE" && (
              <span className="shrink-0 rounded-full border border-line/60 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wider text-ash">
                Private
              </span>
            )}
          </div>
          <h3 className="font-display text-xl font-normal lowercase text-bone">{project.title}</h3>
          <p className="line-clamp-2 font-sans text-sm text-ash/80">{excerpt}</p>
          {authorName && <p className="font-sans text-xs text-ash/60">{authorName}</p>}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group flex flex-col overflow-hidden rounded-[20px] border border-line/50 bg-charcoal/20 shadow-card transition-shadow hover:border-line/80 hover:shadow-[0_24px_56px_rgba(0,0,0,0.4)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
    >
      <div className="relative aspect-[16/9] w-full shrink-0 bg-graphite">
        {project.coverImage && (
          <Image
            src={project.coverImage}
            alt=""
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-slow group-hover:scale-[1.03]"
            unoptimized={isExternalUrl(project.coverImage)}
          />
        )}
        {/* Phase 9.3 — Feed Redesign. The brief is explicit that a
           project card in the Feed needs to visually read as "a
           project, not a post" at a glance — this tag is that signal.
           Reuses the site's one accent color (brass) rather than
           introducing a new token. */}
        <span className="absolute left-4 top-4 rounded-full border border-brass/40 bg-graphite/80 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-brass backdrop-blur-sm">
          Проєкт
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-8">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-xl text-bone">{project.title}</h3>
          {project.visibility === "PRIVATE" && (
            <span className="shrink-0 rounded-full border border-line/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ash">
              Private
            </span>
          )}
        </div>
        <p className="line-clamp-3 font-sans text-sm text-ash/80">{excerpt}</p>
        {(authorName || project.createdAt) && (
          <p className="mt-auto pt-2 font-mono text-[11px] uppercase tracking-wider text-ash/70">
            {authorName}
            {authorName && " · "}
            {formatDate(project.createdAt.toISOString())}
          </p>
        )}
      </div>
    </Link>
  );
}
