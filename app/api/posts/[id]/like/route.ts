import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPostById } from "@/lib/posts";
import { togglePostLike } from "@/lib/post-likes";
import { createNotification } from "@/lib/notifications";

// Feed redesign. Same "single POST toggle, not separate POST/DELETE"
// shape as app/api/projects/[slug]/like/route.ts — see that route's own
// comment for the full reasoning, not repeated here. Posts have no
// visibility field to check (unlike a PRIVATE Project) — every Post is
// publicly visible today, so there's no equivalent 404-for-non-owner
// guard needed here.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const post = await getPostById(id);
  if (!post) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const result = await togglePostLike(post.id, session.user.id);

  // Same "only notify on like, not unlike" rule as the Project version —
  // createNotification itself skips the self-like case.
  if (result.liked) {
    await createNotification({
      recipientId: post.userId,
      actorId: session.user.id,
      type: "POST_LIKE",
      entityId: post.id,
    });
  }

  return NextResponse.json(result);
}
