import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createProject, getProjectsGalleryPage, type ProjectGallerySort } from "@/lib/projects";
import { isValidGithubUrl, isValidHttpUrl } from "@/lib/utils";
import { createCustomTag, replaceProjectTags, MAX_CUSTOM_TAG_LENGTH, MAX_TAGS_PER_PROJECT } from "@/lib/tags";

// Phase 6.1 — Projects Foundation.
//
// Route Handler, not a Server Action, per this phase's brief (same
// deliberate choice Phase 5.1 made for app/api/follow/route.ts): the
// create form (components/projects/ProjectForm.tsx) is a Client
// Component that needs the newly generated slug back in the response to
// redirect to `/projects/[slug]`, which a plain <form action={...}>
// posting to a Server Action doesn't hand back as JSON.
//
// Same auth pattern as every other write path in the app: only
// `auth()`'s session decides who the author is. The request body can
// supply a title/description/coverImage — never an authorId, a slug, or
// a visibility (visibility defaults to PUBLIC at creation; only the
// PATCH route, scoped to the owner, can change it later).

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 4000;
// Phase 6.2 — Project Showcase.
const MAX_SHORT_DESCRIPTION_LENGTH = 200;

interface CreateBody {
  title: string;
  description: string;
  coverImage: string | null;
  shortDescription: string | null;
  githubUrl: string | null;
  externalUrl: string | null;
  tagIds: string[];
  customTagNames: string[];
}

function readCreateInput(body: unknown): CreateBody | null {
  if (typeof body !== "object" || body === null) return null;
  const {
    title,
    description,
    coverImage,
    shortDescription,
    githubUrl,
    externalUrl,
    tagIds,
    customTagNames,
  } = body as Record<string, unknown>;
  if (typeof title !== "string" || typeof description !== "string") return null;

  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  if (!trimmedTitle || !trimmedDescription) return null;
  if (trimmedTitle.length > MAX_TITLE_LENGTH) return null;
  if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) return null;

  const trimmedCover = typeof coverImage === "string" ? coverImage.trim() : "";

  // shortDescription/githubUrl/externalUrl are all optional — an empty
  // string is treated the same as "not provided" (null), matching
  // coverImage's existing behavior above. Any non-empty value still has
  // to pass validation, though: this route rejects bad input rather than
  // silently dropping it.
  const trimmedShortDescription =
    typeof shortDescription === "string" ? shortDescription.trim() : "";
  if (trimmedShortDescription.length > MAX_SHORT_DESCRIPTION_LENGTH) return null;

  const trimmedGithubUrl = typeof githubUrl === "string" ? githubUrl.trim() : "";
  if (trimmedGithubUrl && !isValidGithubUrl(trimmedGithubUrl)) return null;

  const trimmedExternalUrl = typeof externalUrl === "string" ? externalUrl.trim() : "";
  if (trimmedExternalUrl && !isValidHttpUrl(trimmedExternalUrl)) return null;

  // Phase 10 — Tags. Both arrays are optional (a project can have zero
  // tags); anything malformed is dropped rather than rejecting the whole
  // request, since tags are additive, non-critical content — same
  // leniency `alt` text gets elsewhere in this app. Combined count is
  // capped here too, defense-in-depth alongside the same cap
  // replaceProjectTags/createCustomTag enforce server-side.
  const cleanTagIds = Array.isArray(tagIds)
    ? tagIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const cleanCustomTagNames = Array.isArray(customTagNames)
    ? customTagNames
        .filter((name): name is string => typeof name === "string")
        .map((name) => name.trim())
        .filter((name) => name.length > 0 && name.length <= MAX_CUSTOM_TAG_LENGTH)
    : [];
  const totalTags = cleanTagIds.length + cleanCustomTagNames.length;
  if (totalTags > MAX_TAGS_PER_PROJECT) return null;

  return {
    title: trimmedTitle,
    description: trimmedDescription,
    coverImage: trimmedCover || null,
    shortDescription: trimmedShortDescription || null,
    githubUrl: trimmedGithubUrl || null,
    externalUrl: trimmedExternalUrl || null,
    tagIds: cleanTagIds,
    customTagNames: cleanCustomTagNames,
  };
}

const VALID_SORTS: ProjectGallerySort[] = ["recent", "mostLiked", "mostViewed", "trending"];

// Projects Gallery — GET on the same route the create form's POST
// already lives on, same REST-collection convention ("GET lists, POST
// creates") the rest of this app's routes follow. Public, no auth check
// (matches getPublicProjects/getProjectsGalleryPage's own PUBLIC-only
// filter — nothing here can leak a PRIVATE project to a visitor who
// isn't its owner, since the gallery never passes includePrivate the
// way the profile page's own project list does).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const pageParam = Number.parseInt(searchParams.get("page") ?? "0", 10);
  const page = Number.isFinite(pageParam) && pageParam >= 0 ? pageParam : 0;

  const sortParam = searchParams.get("sort");
  const sort = VALID_SORTS.includes(sortParam as ProjectGallerySort)
    ? (sortParam as ProjectGallerySort)
    : "recent";

  const search = searchParams.get("q") ?? undefined;

  const result = await getProjectsGalleryPage({ page, sort, search });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const input = readCreateInput(body);
  if (!input) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 });
  }

  const project = await createProject(session.user.id, input);

  // Phase 10 — Tags. Built-in tags were already real Tag rows (picked
  // from search), so they're attached directly; each staged custom-tag
  // name becomes its own new Tag row scoped to this project — see
  // createCustomTag's own comment for why identically-named custom tags
  // on two different projects are never the same row. Best-effort in the
  // sense that a project is never rolled back over a tag failure (same
  // spirit as the gallery-upload loop in ProjectForm), but every failure
  // here is still logged for visibility.
  if (input.tagIds.length > 0) {
    await replaceProjectTags(project.id, session.user.id, input.tagIds);
  }
  for (const name of input.customTagNames) {
    try {
      await createCustomTag(project.id, session.user.id, name);
    } catch (error) {
      console.error("[api/projects] failed to create custom tag on new project:", error);
    }
  }

  return NextResponse.json({ project }, { status: 201 });
}
