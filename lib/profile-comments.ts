import { Prisma, type Profile, type ProfileComment, type User } from "@prisma/client";
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
  // Phase 12, point 11 — Comment Likes.
  likesCount: number;
  viewerHasLiked: boolean;
  /** Whether the profile owner is among this comment's likers — the
   * mockup's highlighted "creator like". Derived at read time by
   * comparing each like's userId against `profileUserId`, never stored
   * as its own column — see ProfileCommentLike's own comment in
   * prisma/schema.prisma for why. */
  isCreatorLike: boolean;
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
  likesCount: number;
  viewerHasLiked: boolean;
  isCreatorLike: boolean;
}

type UserWithProfile = User & { profile: Profile | null };

// Phase 12, point 11 — Comment Likes. Every like on every comment in
// this thread, keyed by commentId — one query, not N — so
// getProfileComments stays a single round trip regardless of how many
// comments/replies a profile has.
interface LikeSummary {
  count: number;
  viewerHasLiked: boolean;
  isCreatorLike: boolean;
}

async function summarizeLikes(
  commentIds: string[],
  profileUserId: string,
  viewerId: string | null
): Promise<Map<string, LikeSummary>> {
  if (commentIds.length === 0) return new Map();

  const likes = await prisma.profileCommentLike.findMany({
    where: { commentId: { in: commentIds } },
    select: { commentId: true, userId: true },
  });

  const map = new Map<string, LikeSummary>();
  for (const like of likes) {
    const current = map.get(like.commentId) ?? { count: 0, viewerHasLiked: false, isCreatorLike: false };
    current.count += 1;
    if (viewerId && like.userId === viewerId) current.viewerHasLiked = true;
    if (like.userId === profileUserId) current.isCreatorLike = true;
    map.set(like.commentId, current);
  }
  return map;
}

function toReplyWithAuthor(
  row: ProfileComment & { author: UserWithProfile },
  likes: Map<string, LikeSummary>
): ProfileReplyWithAuthor {
  const summary = likes.get(row.id);
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    authorId: row.authorId,
    author: toFollowListEntry(row.author),
    likesCount: summary?.count ?? 0,
    viewerHasLiked: summary?.viewerHasLiked ?? false,
    isCreatorLike: summary?.isCreatorLike ?? false,
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

export async function getProfileComments(
  profileUserId: string,
  viewerId: string | null = null
): Promise<ProfileCommentWithAuthor[]> {
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

  const allIds = rows.flatMap((row: CommentRowWithReplies) => [
    row.id,
    ...row.replies.map((reply) => reply.id),
  ]);
  const likes = await summarizeLikes(allIds, profileUserId, viewerId);

  return rows.map((row: CommentRowWithReplies) => {
    const summary = likes.get(row.id);
    return {
      id: row.id,
      content: row.content,
      createdAt: row.createdAt,
      authorId: row.authorId,
      author: toFollowListEntry(row.author),
      replies: row.replies.map((reply) => toReplyWithAuthor(reply, likes)),
      likesCount: summary?.count ?? 0,
      viewerHasLiked: summary?.viewerHasLiked ?? false,
      isCreatorLike: summary?.isCreatorLike ?? false,
    };
  });
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

// Phase 12, point 11 — Comment Likes. "Anyone can like any comment" —
// no ownership check beyond "the comment exists"; unlike delete, there's
// no author-or-profile-owner restriction here at all. Idempotent: liking
// an already-liked comment (a double click racing itself) just hits the
// `@@unique([commentId, userId])` constraint, which this catches and
// treats as success rather than surfacing a 409 for something the
// client already considers "done".
export async function likeProfileComment(commentId: string, userId: string): Promise<void> {
  try {
    await prisma.profileCommentLike.create({ data: { commentId, userId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return; // already liked — treat as success, not an error
    }
    throw error;
  }
}

export async function unlikeProfileComment(commentId: string, userId: string): Promise<void> {
  await prisma.profileCommentLike.deleteMany({ where: { commentId, userId } });
}
