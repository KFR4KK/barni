import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/projects/ProjectCard";
import type { ProjectListItem } from "@/lib/projects";

interface ProjectsSectionProps {
  // Phase 6.2 — widened from Project[] to ProjectListItem[] alongside
  // lib/projects.ts's getProjectsByAuthorId, since ProjectCard now needs
  // the author join for its byline (but not the `images` gallery join —
  // see ProjectListItem's own comment for why that's a separate,
  // narrower type from ProjectWithAuthor).
  projects: ProjectListItem[];
  /** Whether the signed-in visitor owns this profile. Controls the "New
   * Project" button — the projects array itself is already filtered by
   * the caller (app/members/[slug]/page.tsx only asks lib/projects.ts
   * for PRIVATE projects when this is true), so this component doesn't
   * need to re-check visibility itself. */
  isOwner: boolean;
  /** Phase 12, point 7 — Projects/Posts Switch. False when rendered
   * inside ProfileProjectsPostsSwitcher, which owns the combined
   * "проєкти / пости" heading + sort filter row itself — this section's
   * own heading and "New Project" button would otherwise duplicate it.
   * Defaults to true so this component still works standalone. */
  showHeading?: boolean;
}

// Phase 6.1 — Projects Foundation. Rendered from
// app/members/[slug]/page.tsx as its own section below ProfileContent,
// rather than folded into ProfileContent.tsx itself — keeps this new,
// still-evolving block from touching a component the last three phases
// left alone, and matches how AwardsSection is already composed
// alongside ProfileContent rather than inside it.
export function ProjectsSection({ projects, isOwner, showHeading = true }: ProjectsSectionProps) {
  return (
    <section aria-labelledby="profile-projects-heading">
      {showHeading && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2
            id="profile-projects-heading"
            className="font-mono text-xs uppercase tracking-[0.2em] text-ash"
          >
            Projects
          </h2>
          {isOwner && (
            <Button href="/projects/new" variant="outline">
              Новий проєкт
            </Button>
          )}
        </div>
      )}

      {projects.length === 0 ? (
        <p className="mt-5 font-sans text-sm text-ash">
          {isOwner ? "У вас ще немає жодного проєкту." : "Тут поки що немає жодного проєкту."}
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}
