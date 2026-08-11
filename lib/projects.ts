import { Prisma, ProjectVisibility } from "@prisma/client";
import type { Project, ProjectImage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

// Phase 6.1 — Projects Foundation. Same role as lib/profiles.ts and
// lib/follows.ts: the one place that talks to the Project table, so
// pages/API routes never issue their own inline `prisma.project.*` calls.

export function getProjectBySlug(slug: string): Promise<Project | null> {
  return prisma.project.findUnique({ where: { slug } });
}

export type ProjectWithAuthor = Project & {
  author: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null; createdAt: Date };
  // Phase 6.3 — Project Gallery. Included here (rather than a separate
  // fetch) because this function's only caller, the project detail page
  // (app/projects/[slug]/page.tsx), needs both the byline and the
  // gallery on the same request anyway.
  images: ProjectImage[];
};

// Used by the project detail page (app/projects/[slug]/page.tsx), which
// needs the byline fields getProjectBySlug's plain Project doesn't carry.
// Kept as a separate function rather than always including `author` on
// getProjectBySlug, since the API routes (existence/ownership checks
// only) don't need the extra join on every request.
//
// Phase 10 — the page's redesigned left "Author" column needs a bit more
// than the byline used to: `author.createdAt` (first sign-in — see
// lib/utils.ts's formatPlatformTenure) and `author.avatarUrl` (the
// Discord fallback avatar for an author who hasn't claimed/customized a
// Profile). Both are cheap columns already on User, so this is a wider
// `select`, not a second query.
export function getProjectWithAuthor(slug: string): Promise<ProjectWithAuthor | null> {
  return prisma.project.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true } },
      images: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });
}

// Phase 6.2 — the shape getProjectsByAuthorId below actually returns:
// the author byline join, but deliberately no `images` (unlike
// ProjectWithAuthor) — its only caller, ProjectCard, never renders the
// gallery, only the cover image already on Project itself, so there's
// no reason for every row in an author's project list to carry a second
// join nothing reads.
export type ProjectListItem = Project & {
  author: { username: string | null; displayName: string | null };
  // Phase 12, point 8 — Local Project Filters. The profile page's
  // "Найбільше вподобань" sort option needs a like count per project;
  // a single cheap aggregate (`_count`), not a join that returns rows,
  // so both callers below always include it rather than adding a
  // second, narrower type just for the sorted view.
  likesCount: number;
};

function toProjectListItem(
  row: Project & { author: { username: string | null; displayName: string | null }; _count: { likes: number } }
): ProjectListItem {
  const { _count, ...rest } = row;
  return { ...rest, likesCount: _count.likes };
}

// Lists one author's projects, most recent first. `includePrivate`
// defaults to false — the profile page (app/members/[slug]/page.tsx)
// only passes `true` when the viewer is the profile's own owner, so a
// visitor never sees another member's PRIVATE projects in the list.
//
// Phase 6.2 — now includes the same `author` join as
// getProjectWithAuthor, because ProjectCard (components/projects/
// ProjectCard.tsx) needs a byline. Since every current caller of this
// function is already listing one author's own projects, the join costs
// nothing extra in practice (it's the same author on every row) but
// keeps ProjectCard's props shape identical regardless of which list it
// was rendered from — important once a future phase (e.g. a global
// projects feed) calls this same function across authors.
export async function getProjectsByAuthorId(
  authorId: string,
  options: { includePrivate?: boolean } = {}
): Promise<ProjectListItem[]> {
  const rows = await prisma.project.findMany({
    where: {
      authorId,
      ...(options.includePrivate ? {} : { visibility: ProjectVisibility.PUBLIC }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { username: true, displayName: true } },
      _count: { select: { likes: true } },
    },
  });
  return rows.map(toProjectListItem);
}

// Phase 8.2 — Feed (MVP). Same shape/include as getProjectsByAuthorId
// (ProjectListItem — no `images` join, ProjectCard doesn't render the
// gallery), just across every author instead of one, and always
// PUBLIC-only — the Feed has no concept of "viewer owns this", unlike
// the profile page's `includePrivate`, so a PRIVATE project must never
// appear here for anyone. Lives here, not inline in lib/feed.ts, per
// this codebase's convention that only the module owning a table issues
// `prisma.project.*` calls.
export async function getPublicProjects(): Promise<ProjectListItem[]> {
  const rows = await prisma.project.findMany({
    where: { visibility: ProjectVisibility.PUBLIC },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { username: true, displayName: true } },
      _count: { select: { likes: true } },
    },
  });
  return rows.map(toProjectListItem);
}

const MAX_SLUG_ATTEMPTS = 25;

function isSlugConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Boolean((error.meta?.target as string[] | undefined)?.includes("slug"))
  );
}

export interface CreateProjectInput {
  title: string;
  description: string;
  coverImage: string | null;
  shortDescription: string | null;
  githubUrl: string | null;
  externalUrl: string | null;
}

// Creates a project, generating a unique slug from `title`. Rather than
// checking "is this slug free?" and then writing (a check-then-write gap
// two concurrent creates of the same title could both slip through),
// this retries the actual `create` call itself on a slug conflict (P2002
// on the `slug` unique index) with the next numeric suffix — the same
// idiom app/api/follow/route.ts already uses for its own unique
// constraint (already-following). Requirement: "если slug уже
// существует — добавить числовой суффикс".
export async function createProject(authorId: string, input: CreateProjectInput): Promise<Project> {
  const base = slugify(input.title) || "project";

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    try {
      return await prisma.project.create({
        data: {
          authorId,
          title: input.title,
          slug,
          description: input.description,
          coverImage: input.coverImage,
          shortDescription: input.shortDescription,
          githubUrl: input.githubUrl,
          externalUrl: input.externalUrl,
        },
      });
    } catch (error) {
      if (!isSlugConflict(error)) throw error;
      // slug taken — loop again with the next numeric suffix.
    }
  }

  throw new Error(`Could not generate a unique slug for project "${input.title}".`);
}

export interface UpdateProjectInput {
  title: string;
  description: string;
  coverImage: string | null;
  visibility: ProjectVisibility;
  shortDescription: string | null;
  githubUrl: string | null;
  externalUrl: string | null;
}

// Slug is deliberately absent from `input` and never touched here — per
// the brief, "slug после создания не изменяется автоматически" (and
// there's no UI to change it manually either, in this phase).
//
// Scoped as an `updateMany` on `{ id, authorId }`, not a plain `update`
// on `{ id }` with a separate ownership check beforehand: ownership is
// enforced by the query itself, at the DB layer, the same defense-in-depth
// pattern actions/profile.ts's claim guard and the Follow model's unique
// constraint already use elsewhere in this app. Returns null if the
// project doesn't exist or isn't owned by `authorId` — callers (the PATCH
// route) turn that into a 403/404, never a silent success.
export async function updateProject(
  projectId: string,
  authorId: string,
  input: UpdateProjectInput
): Promise<Project | null> {
  const result = await prisma.project.updateMany({
    where: { id: projectId, authorId },
    data: {
      title: input.title,
      description: input.description,
      coverImage: input.coverImage,
      visibility: input.visibility,
      shortDescription: input.shortDescription,
      githubUrl: input.githubUrl,
      externalUrl: input.externalUrl,
    },
  });

  if (result.count === 0) return null;
  return prisma.project.findUnique({ where: { id: projectId } });
}

// Phase 6.3 — Project Gallery. Same "one module owns this table" role as
// everything above, just for ProjectImage instead of Project.

// A project can have at most this many gallery images. Shared by the
// upload route (app/api/projects/[slug]/images/route.ts, the actual
// enforcement point), ProjectGalleryEditor (edit-page picker) and
// ProjectForm (create-page picker) — previously each of those three
// redeclared the same `12` locally with a "mirrors X" comment; hoisted
// here since Phase 6.4 needed a third copy and three copies of a magic
// number that must stay in sync is one too many.
export const MAX_GALLERY_IMAGES = 12;

// Used by the edit page (app/projects/[slug]/edit/page.tsx) to seed
// ProjectGalleryEditor's initial list — the project detail page instead
// gets its images for free via getProjectWithAuthor's `include` above,
// since it's already fetching the Project row anyway.
export function getProjectImages(projectId: string): Promise<ProjectImage[]> {
  return prisma.projectImage.findMany({
    where: { projectId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export interface CreateProjectImageInput {
  imageUrl: string;
  alt: string | null;
}

// Ownership is checked here (project.findFirst scoped to authorId),
// before ever writing a row — same "enforced at the DB layer, not just
// the caller's judgment" defense-in-depth as updateProject above. Returns
// null if the project doesn't exist or isn't owned by `authorId`; the
// upload route (app/api/projects/[slug]/images/route.ts) turns that into
// a 403/404 and — importantly — checks this *before* uploading the file
// to Storage, so a non-owner's request never even reaches Storage.
export async function addProjectImage(
  projectId: string,
  authorId: string,
  input: CreateProjectImageInput
): Promise<ProjectImage | null> {
  const project = await prisma.project.findFirst({ where: { id: projectId, authorId } });
  if (!project) return null;

  // New image goes to the end of the gallery. Not a count() (which would
  // renumber wrong after a delete leaves a gap) — the actual max, so
  // order stays monotonically increasing even as images are removed.
  const { _max } = await prisma.projectImage.aggregate({
    where: { projectId },
    _max: { order: true },
  });

  return prisma.projectImage.create({
    data: {
      projectId,
      imageUrl: input.imageUrl,
      alt: input.alt,
      order: (_max.order ?? -1) + 1,
    },
  });
}

// Scoped to `{ id: imageId, projectId, project: { authorId } }` — the
// same ownership-enforced-by-the-query-itself idiom as updateProject,
// extended one level through the relation so a request for someone
// else's image (even a valid imageId) can never match. Returns the
// deleted row (not just a boolean) so the caller — the delete route —
// has `imageUrl` in hand to also remove the file from Storage.
export async function deleteProjectImageIfOwned(
  imageId: string,
  projectId: string,
  authorId: string
): Promise<ProjectImage | null> {
  const image = await prisma.projectImage.findFirst({
    where: { id: imageId, projectId, project: { authorId } },
  });
  if (!image) return null;

  const result = await prisma.projectImage.deleteMany({
    where: { id: image.id, projectId, project: { authorId } },
  });
  if (result.count === 0) return null;

  return image;
}

// Phase 6.5 — Project Deletion.
//
// Same ownership-enforced-by-the-query-itself idiom as updateProject and
// deleteProjectImageIfOwned above: `deleteMany` scoped to `{ id, authorId }`
// so a non-owner's request can never delete anything, no separate
// check-then-write gap. `include: { images: true }` on the read is
// deliberate — ProjectImage rows are removed from the DB automatically via
// `onDelete: Cascade` (see prisma/schema.prisma), but the actual files in
// Supabase Storage are not, so the caller (the DELETE route) needs each
// image's `imageUrl` in hand *before* the row disappears in order to clean
// those up afterward. Returns the project as it was immediately before
// deletion (including its images) rather than a boolean, for that reason.
export async function deleteProjectIfOwned(
  projectId: string,
  authorId: string
): Promise<(Project & { images: ProjectImage[] }) | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, authorId },
    include: { images: true },
  });
  if (!project) return null;

  const result = await prisma.project.deleteMany({ where: { id: projectId, authorId } });
  if (result.count === 0) return null;

  return project;
}
