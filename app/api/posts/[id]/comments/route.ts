import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPostById } from "@/lib/posts";
import { getUserDisplayById } from "@/lib/follows";
import { createPostComment, getPostCommentById, MAX_COMMENT_LENGTH } from "@/lib/post-comments";
import { createNotification } from "@/lib/notifications";

// Phase 8.1 — Post Comments.
//
// Same shape as app/api/projects/[slug]/comments/route.ts's POST handler
// (Project Comments), keyed by the post's `id` instead of a project
// `slug` — resolved through lib/posts.ts's existing getPostById rather
// than a new lookup. No GET here: unlike the Project detail page, a Post
// has no dedicated page in this app yet (see lib/posts.ts's own
// comment) — the profile page fetches each post's comments directly via
// lib/post-comments.ts's getPostComments, the same "server page fetches,
// this route only ever handles a write" split Project Comments' GET
// branch doesn't need here.

function readCreateInput(body: unknown): { content: string; parentId: string | null } | null {
  if (typeof body !== "object" || body === null) return null;
  const { content, parentId } = body as Record<string, unknown>;
  if (typeof content !== "string") return null;

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) return null;

  if (parentId !== undefined && parentId !== null && typeof parentId !== "string") return null;

  return { content: trimmed, parentId: typeof parentId === "string" ? parentId : null };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const post = await getPostById(id);
  if (!post) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
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

  // Null here means either the body's parentId didn't resolve to a
  // top-level comment on this post, or it pointed at a reply — same
  // "you tried to reply to something you can't reply to" case as
  // createProjectComment/createProfileComment.
  const created = await createPostComment(post.id, session.user.id, input);
  if (!created) {
    return NextResponse.json({ error: "invalid-parent" }, { status: 400 });
  }

  // Same split as the Project/Profile Comments POST routes, and the same
  // existing Notifications architecture (lib/notifications.ts) — no new
  // notification logic, just two of its existing calls: a reply notifies
  // the parent comment's author (COMMENT_REPLY), a top-level comment
  // notifies the post's author (POST_COMMENT). createNotification itself
  // already skips the self-notification case (e.g. commenting on your
  // own post).
  if (created.parentId) {
    const parent = await getPostCommentById(created.parentId);
    if (parent) {
      await createNotification({
        recipientId: parent.authorId,
        actorId: session.user.id,
        type: "COMMENT_REPLY",
        entityId: created.id,
      });
    }
  } else {
    await createNotification({
      recipientId: post.userId,
      actorId: session.user.id,
      type: "POST_COMMENT",
      entityId: created.id,
    });
  }

  // Same reasoning as the Project/Profile Comments POST routes: the
  // client needs the new comment's author display immediately, without
  // a full refetch of the list.
  const author = await getUserDisplayById(session.user.id);

  return NextResponse.json({
    comment: {
      id: created.id,
      content: created.content,
      createdAt: created.createdAt,
      authorId: created.authorId,
      parentId: created.parentId,
      author,
    },
  });
}
