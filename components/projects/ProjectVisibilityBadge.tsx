import type { ProjectVisibility } from "@prisma/client";

interface ProjectVisibilityBadgeProps {
  visibility: ProjectVisibility;
}

// Phase 6.2 — Project Showcase. A small, standalone pill rather than a
// prop bolted onto an existing component — same "one place, reused
// wherever visibility needs to be shown" role components/members/
// DiscordBadge.tsx already plays for Discord membership status, and the
// same pill shape (rounded-full, border-line, font-sans uppercase label)
// so it reads as part of the existing design language rather than a new
// one. Always renders, for either value — unlike the inline "Private"
// text app/projects/[slug]/page.tsx used before this phase, this is the
// explicit "Badge with current Visibility" the brief asks for, PUBLIC
// included.
export function ProjectVisibilityBadge({ visibility }: ProjectVisibilityBadgeProps) {
  const isPrivate = visibility === "PRIVATE";

  return (
    <span
      className={
        isPrivate
          ? "inline-flex items-center gap-2 rounded-full border border-line/60 bg-charcoal/40 px-3.5 py-1.5 font-sans text-xs uppercase tracking-wider text-ash"
          : "inline-flex items-center gap-2 rounded-full border border-brass/30 bg-brass/10 px-3.5 py-1.5 font-sans text-xs uppercase tracking-wider text-brass"
      }
    >
      <span
        className={isPrivate ? "h-1.5 w-1.5 rounded-full bg-ash" : "h-1.5 w-1.5 rounded-full bg-brass"}
        aria-hidden="true"
      />
      {isPrivate ? "Private" : "Public"}
    </span>
  );
}
