import type { Profile, User } from "@prisma/client";
import { prisma } from "@/lib/db";

// Phase 5.1 — Follow System.
//
// Same role as lib/profiles.ts: the one place that reads Follow rows, so
// pages don't write their own prisma.follow.count()/findUnique() calls
// inline. app/api/follow/route.ts (the write path) intentionally does its
// own count() after a write rather than importing from here, since it
// needs the count in the same request that just changed it — but every
// read-only display path (the member page, /profile) goes through this
// file.

export interface FollowCounts {
  followers: number;
  following: number;
}

// Followers = rows where this user is the one being followed.
// Following = rows where this user is the one who clicked Follow.
export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);
  return { followers, following };
}

// Whether `followerId` currently follows `followingId`. Used to decide
// whether a profile page renders a "Follow" or "Following" button for the
// signed-in viewer. Always false for viewing your own profile — callers
// don't need to special-case that themselves, since a self-follow row can
// never exist (the API route rejects creating one).
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false;
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  return existing !== null;
}

// ---------------------------------------------------------------------------
// Phase 5.2 — Followers & Following lists
//
// The brief for this phase is explicit that the Prisma schema doesn't
// change — everything below reads the existing `User`, `Profile`, and
// `Follow` models exactly as they are.

// Safety cap on list size. Not pagination (explicitly out of scope for
// this phase) — just a defensive upper bound so a pathologically large
// follower graph can't turn one GET request into an unbounded query. Well
// above what "don't optimize for tens of thousands of users" implies this
// project needs today.
const FOLLOW_LIST_MAX = 1000;

export interface FollowListEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** Profile bio, if this user has claimed a Profile — null otherwise. */
  bio: string | null;
  /** Profile slug for linking to `/members/[slug]`, if claimed — null
   * otherwise. Also doubles as "does this user have a claimed profile",
   * which is what decides whether a Discord badge renders for them (see
   * components/members/FollowListItem.tsx). */
  profileSlug: string | null;
  /** Only meaningful when `profileSlug` isn't null — Phase 4's Discord
   * membership sync only ever writes to a claimed Profile. */
  serverMember: boolean;
}

// The shape every "show a user publicly" list in this app resolves down
// to: FollowListItem, CommentItem (lib/profile-comments.ts), and anything
// similar later all need exactly these fields (avatar, name, link,
// membership badge) and nothing more sensitive. Exported — not just used
// internally — so Phase 7.1's Profile Comments feature reuses this
// resolution instead of redeclaring its own version of the same mapping.
export function toFollowListEntry(user: User & { profile: Profile | null }): FollowListEntry {
  return {
    userId: user.id,
    username: user.username,
    displayName: user.profile?.displayName || user.displayName || user.username,
    avatarUrl: user.profile?.avatar || user.avatarUrl,
    bio: user.profile?.bio || null,
    profileSlug: user.profile?.slug ?? null,
    serverMember: user.profile?.serverMember ?? false,
  };
}

// The people following `userId`, most recently followed first.
export async function getFollowerList(userId: string): Promise<FollowListEntry[]> {
  const rows = await prisma.follow.findMany({
    where: { followingId: userId },
    orderBy: { createdAt: "desc" },
    take: FOLLOW_LIST_MAX,
    include: { follower: { include: { profile: true } } },
  });
  return rows.map((row: { follower: User & { profile: Profile | null } }) =>
    toFollowListEntry(row.follower)
  );
}

// The people `userId` follows, most recently followed first.
export async function getFollowingList(userId: string): Promise<FollowListEntry[]> {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId },
    orderBy: { createdAt: "desc" },
    take: FOLLOW_LIST_MAX,
    include: { following: { include: { profile: true } } },
  });
  return rows.map((row: { following: User & { profile: Profile | null } }) =>
    toFollowListEntry(row.following)
  );
}

// Resolves the `[username]` segment in
// app/api/users/[username]/{followers,following}/route.ts to a User id.
//
// NOTE: `username` is not a unique column on `User` (see the schema
// comment on that field) — this is deliberately `findFirst`, not
// `findUnique`, and can only ever return one row even if more than one
// User happens to share a username. In practice Discord's own username
// system is globally unique per account as of the 2023 migration away
// from discriminators, so a real collision shouldn't occur — but it isn't
// enforced at the DB level here, and this phase's brief says not to
// change the schema. See README's Phase 5.2 section.
export async function getUserByUsername(username: string): Promise<{ id: string } | null> {
  return prisma.user.findFirst({ where: { username }, select: { id: true } });
}

// The reverse lookup: given a User.id (e.g. a claimed Profile's
// `userId`), get the username needed to build the two Route Handler URLs
// above. Kept here rather than in lib/profiles.ts since it's a User
// column, not a Profile one — Profile doesn't store username itself.
export async function getUsernameByUserId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  return user?.username ?? null;
}

// Resolves one user's public display fields — the same shape
// getFollowerList/getFollowingList produce per row, just for a single
// known id instead of a whole Follow-backed list. Phase 7.1's Profile
// Comments feature uses this to attach an author's display info to a
// freshly created comment before returning it from the POST route,
// without duplicating toFollowListEntry's mapping.
export async function getUserDisplayById(userId: string): Promise<FollowListEntry | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  return user ? toFollowListEntry(user) : null;
}

