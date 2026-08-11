import { randomBytes } from "crypto";
import { Prisma, ProjectVisibility } from "@prisma/client";
import type { Tag } from "@prisma/client";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

// Phase 10 — Tags. Same role as lib/projects.ts/lib/follows.ts: the one
// module that talks to the Tag/ProjectTag tables, so pages/API routes
// never issue their own inline `prisma.tag.*`/`prisma.projectTag.*`
// calls. See prisma/schema.prisma's Tag/ProjectTag comments for the
// full data-model reasoning.

// ---------------------------------------------------------------------
// Built-in tag catalog — the single source of truth. Adding a new
// built-in tag later is just adding a line here and re-running
// `npx prisma db seed` (prisma/seed.ts upserts every entry below into
// the Tag table by slug, `update: {}` so re-running never renames an
// already-seeded tag out from under existing projects). Nothing else
// needs to change: search, the tag picker, and the Popular Tags card all
// read from the database, not from this list directly.
// ---------------------------------------------------------------------
export const BUILT_IN_TAGS: readonly string[] = [
  "Web Design",
  "UI/UX",
  "Development",
  "Frontend",
  "Backend",
  "Full Stack",
  "Mobile",
  "Desktop",
  "API",
  "Database",
  "Discord Bot",
  "AI",
  "Machine Learning",
  "Cybersecurity",
  "3D",
  "Blender",
  "Motion Design",
  "Graphic Design",
  "Branding",
  "Art",
  "Illustration",
  "Pixel Art",
  "Photography",
  "Video",
  "Video Editing",
  "Music",
  "Sound Design",
  "Game Development",
  "Minecraft",
  "Figma",
];

// A project can carry at most this many tags (built-in + custom
// combined) — same "shared constant, not three copies of a magic
// number" idiom as lib/projects.ts's MAX_GALLERY_IMAGES.
export const MAX_TAGS_PER_PROJECT = 10;

export const MAX_CUSTOM_TAG_LENGTH = 30;

export interface TagOption {
  id: string;
  name: string;
  slug: string;
  isBuiltIn: boolean;
}

function toTagOption(tag: Tag): TagOption {
  return { id: tag.id, name: tag.name, slug: tag.slug, isBuiltIn: tag.isBuiltIn };
}

// Search-as-you-type source for the tag picker
// (components/projects/TagPicker.tsx via app/api/tags/search/route.ts).
// Built-in tags are global — anyone typing "web" sees them regardless of
// which project they're editing. Custom tags are scoped to the one
// project they belong to (per the brief: "вони повинні відображатися
// тільки всередині проєкту, якому належать") — a custom tag created on
// project A must never appear as a suggestion on project B, so
// `projectId` is required to see any custom results at all, and a null
// `projectId` (the create-a-new-project flow, before a project exists)
// only ever searches built-in tags.
export async function searchTags(
  query: string,
  projectId: string | null,
  limit = 8
): Promise<TagOption[]> {
  const trimmed = query.trim();

  const tags = await prisma.tag.findMany({
    where: {
      OR: [
        { isBuiltIn: true },
        ...(projectId ? [{ isBuiltIn: false, projectTags: { some: { projectId } } }] : []),
      ],
      ...(trimmed ? { name: { contains: trimmed, mode: Prisma.QueryMode.insensitive } } : {}),
    },
    orderBy: [{ isBuiltIn: "desc" as const }, { name: "asc" as const }],
    take: limit,
  });

  return tags.map(toTagOption);
}

// All tags currently attached to a project (built-in + its own custom
// ones), built-in first — used by the project detail page's tag list and
// to seed the edit form's initial selection.
export async function getProjectTags(projectId: string): Promise<TagOption[]> {
  const rows = await prisma.projectTag.findMany({
    where: { projectId },
    include: { tag: true },
    orderBy: [{ tag: { isBuiltIn: "desc" } }, { tag: { name: "asc" } }],
  });
  return rows.map((row) => toTagOption(row.tag));
}

// Bulk variant of getProjectTags for list views (e.g. a future projects
// grid with tag chips) that would otherwise issue one query per project.
// Not called
// anywhere yet, but the natural next thing a tag-filtered projects list
// needs, so it's here rather than requiring another migration-adjacent
// pass through this file later.
export async function getTagsForProjects(projectIds: string[]): Promise<Map<string, TagOption[]>> {
  if (projectIds.length === 0) return new Map();

  const rows = await prisma.projectTag.findMany({
    where: { projectId: { in: projectIds } },
    include: { tag: true },
    orderBy: [{ tag: { isBuiltIn: "desc" } }, { tag: { name: "asc" } }],
  });

  const map = new Map<string, TagOption[]>();
  for (const row of rows) {
    const list = map.get(row.projectId) ?? [];
    list.push(toTagOption(row.tag));
    map.set(row.projectId, list);
  }
  return map;
}

const MAX_TAG_SLUG_ATTEMPTS = 10;

// Creates a brand-new custom Tag and attaches it to `projectId` in one
// step (there is no standalone "create an unattached custom tag" — per
// the model comment, a custom tag only ever exists in service of one
// project). Ownership-enforced-by-the-query-itself, same idiom as every
// write in lib/projects.ts: returns null (never throws) if the project
// doesn't exist or isn't owned by `authorId`, or if the name is empty,
// or if the project has already hit MAX_TAGS_PER_PROJECT.
//
// `slug` is generated from the name + a random suffix and retried on
// collision (same MAX_SLUG_ATTEMPTS idiom as lib/projects.ts's
// createProject) rather than deduplicated by name — two different
// projects' "Speedrun" custom tags must end up as two different rows
// (see the Tag model's own comment for why), so the slug's only job here
// is "be unique", never "identify this tag across projects".
export async function createCustomTag(
  projectId: string,
  authorId: string,
  rawName: string
): Promise<TagOption | null> {
  const name = rawName.trim().slice(0, MAX_CUSTOM_TAG_LENGTH);
  if (!name) return null;

  const project = await prisma.project.findFirst({ where: { id: projectId, authorId } });
  if (!project) return null;

  const existingCount = await prisma.projectTag.count({ where: { projectId } });
  if (existingCount >= MAX_TAGS_PER_PROJECT) return null;

  const base = slugify(name) || "tag";

  for (let attempt = 0; attempt < MAX_TAG_SLUG_ATTEMPTS; attempt++) {
    const suffix = randomBytes(4).toString("hex");
    const slug = `custom-${base}-${suffix}`;
    try {
      const tag = await prisma.tag.create({
        data: { slug, name, isBuiltIn: false, createdByUserId: authorId },
      });
      await prisma.projectTag.create({ data: { projectId, tagId: tag.id } });
      return toTagOption(tag);
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      ) {
        throw error;
      }
      // slug collision (astronomically unlikely with a random suffix,
      // but the retry idiom is cheap insurance) — loop again.
    }
  }

  throw new Error(`createCustomTag: could not allocate a unique slug for "${name}".`);
}

// Replaces a project's full built-in-tag selection with `tagIds` —
// used by both the create route (attaching the built-in tags picked
// before the project existed) and the edit route (the tag picker always
// submits its complete current selection, not a diff). Deliberately
// only ever attaches tags that are either built-in or already one of
// this exact project's own custom tags — a client can never attach
// another project's custom tag by guessing its id, since that tag's
// `projectTags` relation won't include this `projectId`.
//
// Ownership-enforced-by-the-query-itself, same idiom as updateProject:
// a project not owned by `authorId` simply has nothing changed.
export async function replaceProjectTags(
  projectId: string,
  authorId: string,
  tagIds: string[]
): Promise<void> {
  const project = await prisma.project.findFirst({ where: { id: projectId, authorId } });
  if (!project) return;

  const uniqueIds = Array.from(new Set(tagIds)).slice(0, MAX_TAGS_PER_PROJECT);
  if (uniqueIds.length === 0) {
    await prisma.projectTag.deleteMany({ where: { projectId } });
    return;
  }

  const validTags = await prisma.tag.findMany({
    where: {
      id: { in: uniqueIds },
      OR: [{ isBuiltIn: true }, { projectTags: { some: { projectId } } }],
    },
    select: { id: true },
  });
  const validIds = validTags.map((tag) => tag.id);

  await prisma.$transaction([
    prisma.projectTag.deleteMany({ where: { projectId, tagId: { notIn: validIds } } }),
    ...validIds.map((tagId) =>
      prisma.projectTag.upsert({
        where: { projectId_tagId: { projectId, tagId } },
        create: { projectId, tagId },
        update: {},
      })
    ),
  ]);
}

export interface PopularTagCount {
  id: string;
  name: string;
  slug: string;
  count: number;
}

// Feed's "Найпопулярніші теги" card (app/feed/page.tsx via
// components/feed/PopularTagsCard.tsx). Built-in tags only, per the
// brief ("користувацькі теги тут ніколи не повинні відображатися") —
// counts how many PUBLIC projects use each built-in tag, sorted
// descending. A PRIVATE project's tags never contribute to this count,
// same "PRIVATE means invisible everywhere, not just the profile list"
// rule getPublicProjects already enforces for the Feed itself.
export async function getPopularTags(limit = 8): Promise<PopularTagCount[]> {
  const tags = await prisma.tag.findMany({
    where: { isBuiltIn: true },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: { projectTags: { where: { project: { visibility: ProjectVisibility.PUBLIC } } } },
      },
    },
  });

  return tags
    .map((tag) => ({ id: tag.id, name: tag.name, slug: tag.slug, count: tag._count.projectTags }))
    .filter((tag) => tag.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
