import Image from "next/image";
import Link from "next/link";
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
  };
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
export function ProjectCard({ project }: ProjectCardProps) {
  const excerpt = project.shortDescription || project.description;
  const authorName = project.author?.displayName || project.author?.username;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group flex flex-col overflow-hidden rounded-card border border-line/60 bg-charcoal/30 transition-colors duration-base hover:border-brass/50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
    >
      <div className="relative aspect-[16/10] w-full shrink-0 bg-graphite">
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
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-lg text-bone">{project.title}</h3>
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
