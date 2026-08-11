import type { Profile, PostComment, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toFollowListEntry, type FollowListEntry } from "@/lib/follows";
import { MAX_COMMENT_LENGTH } from "@/lib/profile-comments";

// Phase 8.1 — Post Comments. Same role as lib/profile-comments.ts and
// lib/project-comments.ts: the one place that talks to the PostComment
// table — no component or Route Handler issues its own inline
// `prisma.postComment.*` call.
//
// Deliberately mirrors lib/project-comments.ts field-for-field rather
// than generalizing all three comment modules into one shared one — see
// schema.prisma's comment on the PostComment model for why. What *is*
// reused directly, not re-declared: `toFollowListEntry` (the author
// shape) and `MAX_COMMENT_LENGTH` (the same 1000-char limit already
// shared between Profile and Project Comments).
export { MAX_COMMENT_LENGTH };

// Same shape as ProfileCommentAuthor/ProjectCommentAuthor — all three
// are just FollowListEntry, the one "show a user publicly" shape this
// app already has (see lib/follows.ts's own comment on it).
export type PostCommentAuthor = FollowListEntry;

export interface PostReplyWithAuthor {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  author: PostCommentAuthor;
}

// Same "replies is a flat array of the reply shape, not recursively
// itself" reasoning as Profile/Project Comments — one level of nesting,
// encoded in the type, not just enforced by createPostComment below.
export interface PostCommentWithAuthor {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  author: PostCommentAuthor;
  replies: PostReplyWithAuthor[];
}

type UserWithProfile = User & { profile: Profile | null };

function toReplyWithAuthor(row: PostComment & { author: UserWithProfile }): PostReplyWithAuthor {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    authorId: row.authorId,
    author: toFollowListEntry(row.author),
  };
}

// Every top-level comment on `postId`, newest first, with its replies
// (oldest first — natural conversation order) nested inline. Same query
// shape as getProjectComments/getProfileComments.
type CommentRowWithReplies = PostComment & {
  author: UserWithProfile;
  replies: (PostComment & { author: UserWithProfile })[];
};

export async function getPostComments(postId: string): Promise<PostCommentWithAuthor[]> {
  const rows = await prisma.postComment.findMany({
    where: { postId, parentId: null },
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

export function getPostCommentById(
  commentId: string
): Promise<(PostComment & { post: { userId: string } }) | null> {
  return prisma.postComment.findUnique({
    where: { id: commentId },
    include: { post: { select: { userId: true } } },
  });
}

export interface CreatePostCommentInput {
  content: string;
  /** Null for a top-level comment; the id of a top-level comment to
   * reply to otherwise. */
  parentId: string | null;
}

// Returns null for any invalid `parentId` — not found, belongs to a
// different post, or is itself a reply rather than a top-level comment.
// Same validation shape as createProjectComment/createProfileComment.
export async function createPostComment(
  postId: string,
  authorId: string,
  input: CreatePostCommentInput
): Promise<PostComment | null> {
  if (input.parentId) {
    const parent = await prisma.postComment.findFirst({
      where: { id: input.parentId, postId, parentId: null },
      select: { id: true },
    });
    if (!parent) return null;
  }

  return prisma.postComment.create({
    data: {
      postId,
      authorId,
      parentId: input.parentId,
      content: input.content,
    },
  });
}

// Scoped to `{ id, OR: [author, post owner] }` — same
// ownership-enforced-by-the-query-itself idiom as
// deleteProjectCommentIfAllowed, extended through the `post` relation
// (rather than a direct column, since PostComment has no second FK to
// User the way ProfileComment.profileUserId does — see the schema
// comment) to check "is this the post's author." Deleting a top-level
// comment cascades to its replies at the DB level.
export async function deletePostCommentIfAllowed(
  commentId: string,
  requesterId: string
): Promise<PostComment | null> {
  const where = {
    id: commentId,
    OR: [{ authorId: requesterId }, { post: { userId: requesterId } }],
  };

  const comment = await prisma.postComment.findFirst({ where });
  if (!comment) return null;

  const result = await prisma.postComment.deleteMany({ where });
  if (result.count === 0) return null;

  return comment;
}
