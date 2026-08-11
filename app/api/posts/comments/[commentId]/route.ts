import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deletePostCommentIfAllowed, getPostCommentById } from "@/lib/post-comments";

// Phase 8.1 — Post Comments.
//
// Same shape as app/api/project-comments/[commentId]/route.ts: ownership
// is checked here first (a clean 403 vs 404) and again inside
// deletePostCommentIfAllowed's own deleteMany (the check that actually
// can't be bypassed). "Allowed" mirrors Project/Profile Comments
// exactly: the comment's own author, or the owner of the post it was
// left on — not just "your own comment" — so a post's author can
// moderate their own thread the same way a project's or profile's owner
// already can. Resolved via the comment's `postId` rather than a direct
// column, since PostComment has no `profileUserId`-style second FK to
// User (see schema.prisma's comment on the model).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { commentId } = await params;
  const existing = await getPostCommentById(commentId);
  if (!existing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const isAuthor = existing.authorId === session.user.id;
  const isPostOwner = existing.post.userId === session.user.id;
  if (!isAuthor && !isPostOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const deleted = await deletePostCommentIfAllowed(commentId, session.user.id);
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
