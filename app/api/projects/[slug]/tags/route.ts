import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/projects";
import { createCustomTag, MAX_CUSTOM_TAG_LENGTH } from "@/lib/tags";

// Phase 10 — Tags. A standalone primitive for creating one custom tag on
// an existing project. Not currently called by ProjectForm's own submit
// flow — a custom tag typed into the picker is staged client-side as a
// plain name and sent as part of `customTagNames` in the same
// POST /api/projects or PATCH /api/projects/[slug] request that saves
// the rest of the form (see those routes), so the whole save is one
// request either way, not "create the tag, then save the form". This
// route exists so a future "add a tag from the project page" UI (outside
// the full edit form) has something to call without waiting on that.
//
// Ownership is checked twice for the same reason as every other project
// write route in this app: once here for a clean 403, and again inside
// createCustomTag's own scoped `findFirst`, which is what actually can't
// be bypassed.
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (project.authorId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const name = typeof (body as Record<string, unknown>)?.name === "string"
    ? ((body as Record<string, unknown>).name as string).trim()
    : "";
  if (!name || name.length > MAX_CUSTOM_TAG_LENGTH) {
    return NextResponse.json({ error: "invalid-name" }, { status: 400 });
  }

  const tag = await createCustomTag(project.id, session.user.id, name);
  if (!tag) {
    // Either the ownership check raced (shouldn't happen, already
    // verified above) or the project has already hit MAX_TAGS_PER_PROJECT
    // — both surface the same "couldn't add it" response to the client.
    return NextResponse.json({ error: "could-not-create-tag" }, { status: 400 });
  }

  return NextResponse.json({ tag }, { status: 201 });
}
