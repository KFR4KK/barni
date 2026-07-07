import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteProjectCommentIfAllowed, getProjectCommentById } from "@/lib/project-comments";

// Phase 8.1 — Project Comments.
//
// Same shape as app/api/profile-comments/[commentId]/route.ts: ownership
// is checked here first (so the client gets a clean 403 vs 404) and
// again inside deleteProjectCommentIfAllowed's own deleteMany (the check
// that actually can't be bypassed). "Allowed" is the same rule as
// Profile Comments, just phrased for projects: the comment's own author,
// or the owner of the project it was left on — resolved via the
// comment's `projectId` rather than a direct column, since
// ProjectComment has no `profileUserId`-style second FK to User (see
// schema.prisma's comment on the model for why).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { commentId } = await params;
  const existing = await getProjectCommentById(commentId);
  if (!existing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const isAuthor = existing.authorId === session.user.id;
  const isProjectOwner = existing.project.authorId === session.user.id;
  if (!isAuthor && !isProjectOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const deleted = await deleteProjectCommentIfAllowed(commentId, session.user.id);
  if (!deleted) {
    // Only reachable if something about the comment changed between the
    // check above and this write — belt-and-suspenders, not the
    // expected path.
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // `parentId` tells the client which list to remove the comment from —
  // the top-level list (parentId: null) or a specific comment's replies
  // — without needing a full refetch.
  return NextResponse.json({ ok: true, id: deleted.id, parentId: deleted.parentId });
}
