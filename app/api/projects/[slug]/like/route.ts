import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/projects";
import { toggleLike } from "@/lib/project-likes";
import { createNotification } from "@/lib/notifications";

// Phase 7.3 — Project Likes.
//
// A single POST toggle endpoint, not separate POST/DELETE (unlike
// app/api/follow/route.ts, which has a real follow-vs-unfollow
// distinction) — per the brief, a like button is one action that flips
// state each time it's pressed, so one Route Handler mirrors that
// exactly: LikeButton.tsx always POSTs here, never decides client-side
// which HTTP verb means "like" vs "unlike".
//
// Same visibility rule as app/api/projects/[slug]/comments/route.ts's
// GET/POST: a PRIVATE project 404s for anyone but its author, so liking
// a private project is impossible for a non-owner (there's no button to
// press — see components/projects/LikeButton.tsx — but the route itself
// still enforces it independently, same "never trust the client alone"
// posture every other write path in this app takes).
export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (project.visibility === "PRIVATE" && project.authorId !== session.user.id) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const result = await toggleLike(project.id, session.user.id);

  // Per the brief: "При снятии лайка ничего делать не нужно" — only the
  // liked=true branch (this toggle just turned the like on) notifies.
  // createNotification itself skips the self-like case (liking your own
  // project).
  if (result.liked) {
    await createNotification({
      recipientId: project.authorId,
      actorId: session.user.id,
      type: "PROJECT_LIKE",
      entityId: project.id,
    });
  }

  return NextResponse.json(result);
}
