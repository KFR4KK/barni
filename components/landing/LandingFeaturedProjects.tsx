import { Container } from "@/components/ui/Container";
import { ProjectCarousel } from "@/components/landing/ProjectCarousel";
import { getPublicProjects } from "@/lib/projects";

const FEATURED_LIMIT = 10;

// Reuses the same getPublicProjects() the Feed already calls — no new
// query. getPublicProjects already orders most-recent-first, so this
// just takes the first page of that instead of adding a second,
// near-duplicate "getFeaturedProjects" function.
export async function LandingFeaturedProjects() {
  const projects = (await getPublicProjects()).slice(0, FEATURED_LIMIT);

  if (projects.length === 0) return null;

  return (
    <section className="py-20 sm:py-28">
      <Container feedWide>
        <div className="mb-10 flex flex-col gap-2">
          <h2 className="font-display text-2xl font-normal lowercase text-bone sm:text-3xl">
            Останні проєкти
          </h2>
          <p className="font-sans text-sm text-ash">
            Те, що зараз створюють учасники .vibe.
          </p>
        </div>

        <ProjectCarousel projects={projects} />
      </Container>
    </section>
  );
}
