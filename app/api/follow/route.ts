import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

// Phase 5.1 — Follow System.
//
// The brief for this phase explicitly asks for Route Handlers here
// (POST/DELETE /api/follow), unlike Phase 3/4's write paths
// (actions/profile.ts, actions/discord.ts), which use Server Actions
// invoked from plain <form action={...}>. That's intentional and not a
// silent architecture change: a toggling Follow button needs to flip
// state and update a count in place without a full page navigation,
// which is what these two components (components/members/FollowButton.tsx)
// need a JSON endpoint for. Every other write path in the app keeps using
// Server Actions as before.
//
// Both handlers only ever trust `session.user.id` (from auth()) as the
// follower — the request body supplies nothing about the caller's own
// identity, only which *other* user the caller is trying to follow.

async function readTargetUserId(request: Request): Promise<string | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  if (typeof body !== "object" || body === null) return null;
  const targetUserId = (body as Record<string, unknown>).targetUserId;
  return typeof targetUserId === "string" && targetUserId.length > 0 ? targetUserId : null;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const targetUserId = await readTargetUserId(request);
  if (!targetUserId) {
    return NextResponse.json({ error: "invalid-target" }, { status: 400 });
  }
  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: "cannot-follow-self" }, { status: 400 });
  }

  const targetExists = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!targetExists) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  try {
    await prisma.follow.create({
      data: { followerId: session.user.id, followingId: targetUserId },
    });
    // Only reached on an actual new row — the catch below handles the
    // already-following case, which must NOT notify again (the brief's
    // "Phase 7.4" is about the follow *event*, and a duplicate/idempotent
    // request isn't a new event). createNotification itself also guards
    // against a self-follow, but that path is already rejected above.
    await createNotification({
      recipientId: targetUserId,
      actorId: session.user.id,
      type: "FOLLOW",
    });
  } catch (error) {
    // P2002 = unique constraint violation, i.e. already following. The
    // client's desired end state ("I am following them") already holds,
    // so this is a no-op success, not an error — makes double-clicks and
    // repeated requests safe rather than something the UI has to guard
    // against itself.
    const alreadyFollowing =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!alreadyFollowing) {
      throw error;
    }
  }

  const followersCount = await prisma.follow.count({ where: { followingId: targetUserId } });
  return NextResponse.json({ following: true, followersCount });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const targetUserId = await readTargetUserId(request);
  if (!targetUserId) {
    return NextResponse.json({ error: "invalid-target" }, { status: 400 });
  }

  // deleteMany, not delete: idempotent by construction — unfollowing
  // someone you don't follow (already unfollowed, double-click, stale
  // client state) matches 0 rows and is still a success, not a 404.
  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId: targetUserId },
  });

  const followersCount = await prisma.follow.count({ where: { followingId: targetUserId } });
  return NextResponse.json({ following: false, followersCount });
}
