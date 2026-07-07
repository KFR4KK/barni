import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByUsername, getUserDisplayById } from "@/lib/follows";
import { createProfileComment, getProfileComments, MAX_COMMENT_LENGTH } from "@/lib/profile-comments";

// Phase 7.1 — Profile Comments.
//
// Same route shape as the sibling followers/following handlers in this
// directory: `[username]`, resolved through lib/follows.ts's
// getUserByUsername (same non-unique-username caveat documented there
// applies here too — see that function's comment).
//
// GET is deliberately public (no auth() check) — comments on a profile
// are public content on an already-public page, no more sensitive than
// the profile itself or the Followers/Following lists next to it.

export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const user = await getUserByUsername(username);
  if (!user) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const comments = await getProfileComments(user.id);
  return NextResponse.json({ comments });
}

function readCreateInput(body: unknown): { content: string; parentId: string | null } | null {
  if (typeof body !== "object" || body === null) return null;
  const { content, parentId } = body as Record<string, unknown>;
  if (typeof content !== "string") return null;

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) return null;

  if (parentId !== undefined && parentId !== null && typeof parentId !== "string") return null;

  return { content: trimmed, parentId: typeof parentId === "string" ? parentId : null };
}

export async function POST(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) {
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
  // top-level comment on this profile, or it pointed at a reply — see
  // createProfileComment's comment for exactly which. Either way, from
  // the client's perspective it's the same "you tried to reply to
  // something you can't reply to."
  const created = await createProfileComment(user.id, session.user.id, input);
  if (!created) {
    return NextResponse.json({ error: "invalid-parent" }, { status: 400 });
  }

  // The client needs the new comment's author display (avatar, name,
  // profile link, Discord badge) to render it immediately without a
  // full refetch of the list — getUserDisplayById resolves that from
  // the signed-in session's own id, the same shape every other entry in
  // the list already has.
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
