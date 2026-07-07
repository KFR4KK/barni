import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createProject } from "@/lib/projects";
import { isValidGithubUrl, isValidHttpUrl } from "@/lib/utils";

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
}

function readCreateInput(body: unknown): CreateBody | null {
  if (typeof body !== "object" || body === null) return null;
  const { title, description, coverImage, shortDescription, githubUrl, externalUrl } =
    body as Record<string, unknown>;
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

  return {
    title: trimmedTitle,
    description: trimmedDescription,
    coverImage: trimmedCover || null,
    shortDescription: trimmedShortDescription || null,
    githubUrl: trimmedGithubUrl || null,
    externalUrl: trimmedExternalUrl || null,
  };
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
  return NextResponse.json({ project }, { status: 201 });
}
