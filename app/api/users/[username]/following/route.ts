import { NextResponse } from "next/server";
import { getFollowingList, getUserByUsername } from "@/lib/follows";

// Phase 5.2 — Following list. Same visibility/security reasoning as the
// sibling followers/route.ts — see that file's comment.
export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const user = await getUserByUsername(username);
  if (!user) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const users = await getFollowingList(user.id);
  return NextResponse.json({ users });
}
