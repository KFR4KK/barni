import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteProfileCommentIfAllowed, getProfileCommentById } from "@/lib/profile-comments";

// Phase 7.1 — Profile Comments.
//
// Ownership is checked twice, same reasoning as app/api/projects/[slug]/route.ts's
// PATCH/DELETE: once here (so the client gets a clean 403 vs 404 instead
// of a generic failure), and again inside deleteProfileCommentIfAllowed's
// own `deleteMany` — the second check is the one that actually can't be
// bypassed. "Allowed" here is the brief's rule: the comment's own author,
// or the owner of the profile it was left on.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { commentId } = await params;
  const existing = await getProfileCommentById(commentId);
  if (!existing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const isAuthor = existing.authorId === session.user.id;
  const isProfileOwner = existing.profileUserId === session.user.id;
  if (!isAuthor && !isProfileOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const deleted = await deleteProfileCommentIfAllowed(commentId, session.user.id);
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
