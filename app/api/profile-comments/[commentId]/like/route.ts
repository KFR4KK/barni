import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getProfileCommentById,
  likeProfileComment,
  unlikeProfileComment,
} from "@/lib/profile-comments";

// Phase 12, point 11 — Comment Likes. "Anyone can like any comment" — no
// author-or-owner restriction, unlike the DELETE route next to this one;
// signed-in is the only requirement.
export async function POST(_request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { commentId } = await params;
  const comment = await getProfileCommentById(commentId);
  if (!comment) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  await likeProfileComment(commentId, session.user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { commentId } = await params;
  await unlikeProfileComment(commentId, session.user.id);
  return NextResponse.json({ ok: true });
}
