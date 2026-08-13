import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getProjectBySlug, getProjectImages } from "@/lib/projects";
import { getProjectTags } from "@/lib/tags";
import { Container } from "@/components/ui/Container";
import { formLabelClasses } from "@/lib/form-styles";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectGalleryEditor } from "@/components/projects/ProjectGalleryEditor";
import { DeleteProjectButton } from "@/components/projects/DeleteProjectButton";

interface EditProjectPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ galleryError?: string }>;
}

// Requires both a session and ownership, checked here in the Server
// Component itself — same pattern as /profile/edit (middleware only ever
// covers the UX redirect, never the real authorization; see
// middleware.ts's comment). A signed-in non-owner is sent to the
// project's public page rather than shown a form they can't submit
// anyway (the PATCH route re-checks ownership regardless).
export default async function EditProjectPage({ params, searchParams }: EditProjectPageProps) {
  const { slug } = await params;
  const { galleryError } = await searchParams;
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const project = await getProjectBySlug(slug);
  if (!project) {
    notFound();
  }
  if (project.authorId !== session.user.id) {
    redirect(`/projects/${slug}`);
  }

  // Phase 6.3 — Project Gallery. Fetched alongside the project rather
  // than folded into getProjectBySlug's query: the create form
  // (app/projects/new/page.tsx) still calls getProjectBySlug-adjacent
  // code paths without ever needing images, so this stays a second,
  // explicit call made only where a gallery is actually rendered.
  const [images, tags] = await Promise.all([
    getProjectImages(project.id),
    getProjectTags(project.id),
  ]);

  return (
    <Container>
      <div className="py-16 md:py-24">
        {/* Phase 6.4 — Project Creation Flow. ProjectForm.tsx now lands a
            successful create straight on the project's own view page
            (see that component's handleSubmit) — it only redirects here,
            with ?galleryError=1, when the project was created but one or
            more staged gallery images failed to upload. The project
            itself is never left in an inconsistent state (it's fully
            saved either way); this banner just orients the owner as to
            *why* they ended up on the edit screen instead, and
            ProjectGalleryEditor below already shows exactly which images
            made it so they can add the rest. */}
        {galleryError === "1" && (
          <p className="mb-6 rounded-md border border-brass/40 bg-brass/10 px-4 py-3 font-sans text-xs uppercase tracking-wider text-brass">
            Проєкт створено, але частину зображень галереї завантажити не вдалося. Додайте їх ще раз нижче.
          </p>
        )}

        <p className="font-sans text-xs uppercase tracking-wider text-brass">Редагування</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-3xl text-bone md:text-4xl">{project.title}</h1>
          <Link
            href={`/projects/${project.slug}`}
            className="font-sans text-xs uppercase tracking-wider text-ash underline decoration-transparent underline-offset-4 transition-colors duration-fast hover:text-bone hover:decoration-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
          >
            Переглянути проєкт
          </Link>
        </div>
        <div className="mt-10">
          <ProjectForm mode="edit" project={project} initialTags={tags} />
        </div>
        <div className="mt-12">
          <ProjectGalleryEditor projectSlug={project.slug} initialImages={images} />
        </div>

        {/* Phase 6.5 — Project Deletion. Grouped here, below the gallery
            editor, rather than on the public view page next to
            "Редагувати проєкт" — this edit page is already the one place
            an owner manages everything about a project (fields, cover,
            gallery), so a destructive, irreversible action belongs
            alongside those, not mixed into the page every visitor sees. */}
        <div className="mt-12 border-t border-line/60 pt-8">
          <p className={formLabelClasses}>Danger Zone</p>
          <p className="mt-1 font-sans text-sm text-ash/80">
            Видалення проєкту незворотне: буде втрачено сам проєкт і всі зображення його галереї.
          </p>
          <div className="mt-4">
            <DeleteProjectButton projectSlug={project.slug} projectTitle={project.title} />
          </div>
        </div>
      </div>
    </Container>
  );
}
