import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/projects/ProjectCard";
import type { ProjectWithAuthor } from "@/lib/projects";

interface ProjectsSectionProps {
  // Phase 6.2 — widened from Project[] to ProjectWithAuthor[] alongside
  // lib/projects.ts's getProjectsByAuthorId, since ProjectCard now needs
  // the author join for its byline.
  projects: ProjectWithAuthor[];
  /** Whether the signed-in visitor owns this profile. Controls the "New
   * Project" button — the projects array itself is already filtered by
   * the caller (app/members/[slug]/page.tsx only asks lib/projects.ts
   * for PRIVATE projects when this is true), so this component doesn't
   * need to re-check visibility itself. */
  isOwner: boolean;
}

// Phase 6.1 — Projects Foundation. Rendered from
// app/members/[slug]/page.tsx as its own section below ProfileContent,
// rather than folded into ProfileContent.tsx itself — keeps this new,
// still-evolving block from touching a component the last three phases
// left alone, and matches how AwardsSection is already composed
// alongside ProfileContent rather than inside it.
export function ProjectsSection({ projects, isOwner }: ProjectsSectionProps) {
  return (
    <section aria-labelledby="profile-projects-heading">
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

      {projects.length === 0 ? (
        <p className="mt-5 font-sans text-sm text-ash">
          {isOwner ? "У вас ще немає жодного проєкту." : "Тут поки що немає жодного проєкту."}
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}
