import type { Profile, ProfileComment, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toFollowListEntry, type FollowListEntry } from "@/lib/follows";

// Phase 7.1 — Profile Comments. Same role as lib/profiles.ts,
// lib/follows.ts, and lib/projects.ts: the one place that talks to the
// ProfileComment table — no component or Route Handler issues its own
// inline `prisma.profileComment.*` call.

// A comment's author, resolved to the same public-display shape
// Followers/Following lists already use (avatar, name, profile link,
// Discord badge) — reused via lib/follows.ts's toFollowListEntry rather
// than redeclaring the same User-\>display mapping a second time.
export type ProfileCommentAuthor = FollowListEntry;

export interface ProfileReplyWithAuthor {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  author: ProfileCommentAuthor;
}

// Deliberately has `replies` as a plain array of the *reply* shape above
// (which itself has no `replies` field), not a recursive
// `ProfileCommentWithAuthor[]` — that would let the type system imply
// arbitrarily deep nesting the app never allows. One level, encoded in
// the type, not just enforced by createProfileComment below.
export interface ProfileCommentWithAuthor {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  author: ProfileCommentAuthor;
  replies: ProfileReplyWithAuthor[];
}

type UserWithProfile = User & { profile: Profile | null };

function toReplyWithAuthor(
  row: ProfileComment & { author: UserWithProfile }
): ProfileReplyWithAuthor {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    authorId: row.authorId,
    author: toFollowListEntry(row.author),
  };
}

// Every top-level comment on `profileUserId`'s profile, newest first,
// with its replies (oldest first — natural conversation order) nested
// inline. The one query the profile page and the GET route both need;
// there's no separate "just the count" caller today, so this doesn't
// bother with a lighter-weight variant.
type CommentRowWithReplies = ProfileComment & {
  author: UserWithProfile;
  replies: (ProfileComment & { author: UserWithProfile })[];
};

export async function getProfileComments(profileUserId: string): Promise<ProfileCommentWithAuthor[]> {
  const rows = await prisma.profileComment.findMany({
    where: { profileUserId, parentId: null },
    orderBy: { createdAt: "desc" },
    include: {
      author: { include: { profile: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { include: { profile: true } } },
      },
    },
  });

  return rows.map((row: CommentRowWithReplies) => ({
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    authorId: row.authorId,
    author: toFollowListEntry(row.author),
    replies: row.replies.map(toReplyWithAuthor),
  }));
}

export function getProfileCommentById(commentId: string): Promise<ProfileComment | null> {
  return prisma.profileComment.findUnique({ where: { id: commentId } });
}

// Shared with the POST route's own input validation (app/api/users/
// [username]/profile-comments/route.ts) so the two can never drift.
export const MAX_COMMENT_LENGTH = 1000;

export interface CreateProfileCommentInput {
  content: string;
  /** Null for a top-level comment; the id of a top-level comment to
   * reply to otherwise. */
  parentId: string | null;
}

// Returns null for any invalid `parentId` — not found, belongs to a
// different profile, or (the actual "one level of nesting" rule) is
// itself a reply rather than a top-level comment. The route turns a null
// into a 400, same as every other "invalid input" case it handles.
export async function createProfileComment(
  profileUserId: string,
  authorId: string,
  input: CreateProfileCommentInput
): Promise<ProfileComment | null> {
  if (input.parentId) {
    const parent = await prisma.profileComment.findFirst({
      where: { id: input.parentId, profileUserId, parentId: null },
      select: { id: true },
    });
    if (!parent) return null;
  }

  return prisma.profileComment.create({
    data: {
      profileUserId,
      authorId,
      parentId: input.parentId,
      content: input.content,
    },
  });
}

// Scoped to `{ id, OR: [author, profile owner] }` — the same
// ownership-enforced-by-the-query-itself idiom lib/projects.ts's
// updateProject/deleteProjectIfOwned use, extended to an OR since two
// different people can be allowed to delete the same comment: its own
// author, or the owner of the profile it was left on (per the brief).
// Deleting a top-level comment cascades to its replies at the DB level
// (see the schema's onDelete: Cascade on the self-relation) — nothing
// here needs to delete those separately.
export async function deleteProfileCommentIfAllowed(
  commentId: string,
  requesterId: string
): Promise<ProfileComment | null> {
  const where = {
    id: commentId,
    OR: [{ authorId: requesterId }, { profileUserId: requesterId }],
  };

  const comment = await prisma.profileComment.findFirst({ where });
  if (!comment) return null;

  const result = await prisma.profileComment.deleteMany({ where });
  if (result.count === 0) return null;

  return comment;
}
