import { NextResponse } from "next/server";
import { incrementPostViewCount } from "@/lib/posts";

// Feed redesign. Deliberately no auth check and no ownership/ dedup
// logic — same "plain counter, not a per-viewer analytics table"
// tradeoff as Project.viewCount (see that field's own schema comment).
// Called once per card by components/posts/PostCard.tsx's
// IntersectionObserver as it scrolls into view, signed-in or not.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await incrementPostViewCount(id);
  return NextResponse.json({ ok: true });
}
