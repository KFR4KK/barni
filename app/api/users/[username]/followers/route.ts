import { NextResponse } from "next/server";
import { getFollowerList, getUserByUsername } from "@/lib/follows";

// Phase 5.2 — Followers list.
//
// Deliberately public (no auth() check): the follower/following *counts*
// this list is drilling into are already shown to every visitor, signed
// in or not, on `/members/[slug]` (see components/members/FollowSection.tsx)
// — this endpoint exposes the same information at list granularity, not
// anything more sensitive. Only public-facing fields are returned (see
// lib/follows.ts's FollowListEntry) — no email, discordId, or session data.
export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const user = await getUserByUsername(username);
  if (!user) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const users = await getFollowerList(user.id);
  return NextResponse.json({ users });
}
