import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Phase 7.3 — Project Likes. Same role as lib/follows.ts and
// lib/project-comments.ts: the one place that talks to the ProjectLike
// table — no component or Route Handler issues its own inline
// `prisma.projectLike.*` call.
//
// Per the brief, the like count is never stored as a column on Project —
// it's always computed from this table (getLikesCount below), the same
// "count() over the relation, not a cached field" approach
// lib/follows.ts's getFollowCounts already uses for followers/following.

// Whether `userId` currently has a like on `projectId`. Used to decide
// whether the project page renders a filled or empty heart for the
// signed-in viewer — same role as lib/follows.ts's isFollowing.
export async function hasUserLiked(projectId: string, userId: string): Promise<boolean> {
  const existing = await prisma.projectLike.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return existing !== null;
}

// Total likes on a project. Always derived, never read from a stored
// count — see the module comment above.
export function getLikesCount(projectId: string): Promise<number> {
  return prisma.projectLike.count({ where: { projectId } });
}

export interface ToggleLikeResult {
  liked: boolean;
  likes: number;
}

// Creates the like if it doesn't exist yet, removes it if it does — the
// single "toggle" entry point app/api/projects/[slug]/like/route.ts's
// POST handler calls, rather than separate POST/DELETE endpoints (unlike
// Follow, which has a distinct follow vs. unfollow intent, a like button
// is a single toggle per the brief: "повторное нажатие снимает лайк").
//
// Checks for the existing row first rather than only relying on catching
// a unique-constraint violation on create — mirrors hasUserLiked's own
// query, and keeps the "did we just like or unlike" branch explicit
// rather than inferred from a caught error code.
export async function toggleLike(projectId: string, userId: string): Promise<ToggleLikeResult> {
  const existing = await prisma.projectLike.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (existing) {
    // deleteMany, not delete: idempotent by construction, same reasoning
    // as app/api/follow/route.ts's unfollow path — a double-click or a
    // stale client racing another request just matches 0 rows instead of
    // throwing.
    await prisma.projectLike.deleteMany({ where: { projectId, userId } });
  } else {
    try {
      await prisma.projectLike.create({ data: { projectId, userId } });
    } catch (error) {
      // P2002 = unique constraint violation, i.e. a concurrent request
      // already created this like between our check above and this
      // write. The desired end state ("I have liked this") already
      // holds, so this is a no-op, not an error — same treatment
      // app/api/follow/route.ts gives the equivalent race on follow.
      const alreadyLiked =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!alreadyLiked) {
        throw error;
      }
    }
  }

  const likes = await getLikesCount(projectId);
  return { liked: !existing, likes };
}
