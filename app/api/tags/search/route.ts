import { NextResponse } from "next/server";
import { searchTags } from "@/lib/tags";

// Phase 10 — Tags. Read-only, no auth required — the same tag catalog a
// signed-in author sees while creating a project is fine to expose to a
// signed-out request too (nothing sensitive; it's the same list rendered
// on every public project's page). `projectId` is optional: the create-
// project flow (no project yet) omits it and only gets built-in matches
// back, per searchTags' own comment.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const projectId = searchParams.get("projectId");

  const tags = await searchTags(query, projectId || null);
  return NextResponse.json({ tags });
}
