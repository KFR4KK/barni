import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ProjectsGalleryClient } from "@/components/projects/gallery/ProjectsGalleryClient";
import { getProjectsGalleryPage } from "@/lib/projects";

// Separate Projects Page (Pinterest × Dribbble redesign brief).
//
// A dedicated destination, deliberately independent from /feed (which
// keeps showing only Posts, unchanged — see app/feed/page.tsx, not
// touched by this work at all). Server-renders the first page (default
// sort, no search) for a fast first paint and something real for
// crawlers/no-JS, then hands off to ProjectsGalleryClient for
// search/filter/infinite-scroll — see that component's own comments for
// why each of those is shaped the way it is.
export default async function ProjectsPage() {
  const { items, hasMore } = await getProjectsGalleryPage({ page: 0, sort: "recent" });

  return (
    <Section compact>
      <Container feedWide>
        <div className="mb-10 flex flex-col gap-2">
          <h1 className="font-display text-3xl font-normal lowercase text-bone sm:text-4xl">
            проєкти
          </h1>
          <p className="font-sans text-sm text-ash">
            Роботи спільноти .vibe — гортай, шукай натхнення, знаходь авторів.
          </p>
        </div>

        <ProjectsGalleryClient
          initialProjects={items.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          }))}
          initialHasMore={hasMore}
        />
      </Container>
    </Section>
  );
}
