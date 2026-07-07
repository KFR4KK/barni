import { NextResponse } from "next/server";
import { ProjectVisibility } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getProjectBySlug, updateProject, deleteProjectIfOwned } from "@/lib/projects";
import { isValidGithubUrl, isValidHttpUrl } from "@/lib/utils";
import { deleteImage, getStoragePath, isOwnStorageUrl } from "@/lib/storage";

// Phase 6.1 — Projects Foundation. The one edit path
// (components/projects/ProjectForm.tsx in "edit" mode posts here).
//
// Ownership is checked twice, deliberately: once here (so a non-owner
// gets a clean 403 instead of a confusing 404), and again inside
// lib/projects.ts's updateProject() itself, which scopes its `updateMany`
// to `{ id, authorId }` — the second check is the one that actually can't
// be bypassed, the first is just for a better error response.

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 4000;
// Phase 6.2 — Project Showcase.
const MAX_SHORT_DESCRIPTION_LENGTH = 200;

interface UpdateBody {
  title: string;
  description: string;
  coverImage: string | null;
  visibility: ProjectVisibility;
  shortDescription: string | null;
  githubUrl: string | null;
  externalUrl: string | null;
}

function readUpdateInput(body: unknown): UpdateBody | null {
  if (typeof body !== "object" || body === null) return null;
  const { title, description, coverImage, visibility, shortDescription, githubUrl, externalUrl } =
    body as Record<string, unknown>;
  if (typeof title !== "string" || typeof description !== "string") return null;

  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  if (!trimmedTitle || !trimmedDescription) return null;
  if (trimmedTitle.length > MAX_TITLE_LENGTH) return null;
  if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) return null;

  const trimmedCover = typeof coverImage === "string" ? coverImage.trim() : "";
  const resolvedVisibility =
    visibility === "PRIVATE" ? ProjectVisibility.PRIVATE : ProjectVisibility.PUBLIC;

  const trimmedShortDescription =
    typeof shortDescription === "string" ? shortDescription.trim() : "";
  if (trimmedShortDescription.length > MAX_SHORT_DESCRIPTION_LENGTH) return null;

  const trimmedGithubUrl = typeof githubUrl === "string" ? githubUrl.trim() : "";
  if (trimmedGithubUrl && !isValidGithubUrl(trimmedGithubUrl)) return null;

  const trimmedExternalUrl = typeof externalUrl === "string" ? externalUrl.trim() : "";
  if (trimmedExternalUrl && !isValidHttpUrl(trimmedExternalUrl)) return null;

  return {
    title: trimmedTitle,
    description: trimmedDescription,
    coverImage: trimmedCover || null,
    visibility: resolvedVisibility,
    shortDescription: trimmedShortDescription || null,
    githubUrl: trimmedGithubUrl || null,
    externalUrl: trimmedExternalUrl || null,
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const existing = await getProjectBySlug(slug);
  if (!existing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (existing.authorId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const input = readUpdateInput(body);
  if (!input) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 });
  }

  const updated = await updateProject(existing.id, session.user.id, input);
  if (!updated) {
    // Only reachable if ownership changed between the check above and
    // this write — belt-and-suspenders, not the expected path.
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Phase 6.2, point 5 — once the new cover is safely saved, clean up the
  // old one, but only if it was ever one of ours (isOwnStorageUrl):
  // pre-6.2 projects may still point at an arbitrary external URL, which
  // this must never touch. Best-effort and after the write succeeds, so a
  // Storage hiccup never blocks (or rolls back) the save itself.
  if (
    existing.coverImage &&
    existing.coverImage !== updated.coverImage &&
    isOwnStorageUrl(existing.coverImage)
  ) {
    const oldPath = getStoragePath(existing.coverImage);
    if (oldPath) {
      deleteImage(oldPath).catch((error) => {
        console.error("[api/projects/:slug] failed to delete old cover image:", error);
      });
    }
  }

  return NextResponse.json({ project: updated });
}

// Phase 6.5 — Project Deletion.
//
// Ownership is checked twice for the same reason as PATCH above (clean
// 403 here, real enforcement inside deleteProjectIfOwned's scoped
// deleteMany). ProjectImage rows disappear for free via the schema's
// onDelete: Cascade; what's left is cleaning up the actual files in
// Supabase Storage, which the DB knows nothing about.
export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const existing = await getProjectBySlug(slug);
  if (!existing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (existing.authorId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const deleted = await deleteProjectIfOwned(existing.id, session.user.id);
  if (!deleted) {
    // Only reachable if ownership changed between the check above and
    // this write — belt-and-suspenders, not the expected path.
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Best-effort, same "never block or roll back the write for a Storage
  // hiccup" reasoning as the old-cover cleanup in PATCH above — the
  // project and its ProjectImage rows are already gone from the database
  // by this point regardless of what happens here. Cover and every
  // gallery image are handled the same way; pre-6.2 projects whose
  // coverImage is an external URL are left alone, same as everywhere
  // else isOwnStorageUrl is used.
  const urlsToClean = [deleted.coverImage, ...deleted.images.map((image) => image.imageUrl)].filter(
    (url): url is string => url !== null && isOwnStorageUrl(url)
  );

  for (const url of urlsToClean) {
    const path = getStoragePath(url);
    if (!path) continue;
    deleteImage(path).catch((error) => {
      console.error("[api/projects/:slug] failed to delete storage object during project delete:", error);
    });
  }

  return NextResponse.json({ ok: true });
}
