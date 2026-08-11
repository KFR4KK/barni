import type { Profile, ProjectComment, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toFollowListEntry, type FollowListEntry } from "@/lib/follows";
import { MAX_COMMENT_LENGTH } from "@/lib/profile-comments";

// Phase 8.1 — Project Comments. Same role as lib/profile-comments.ts: the
// one place that talks to the ProjectComment table — no component or
// Route Handler issues its own inline `prisma.projectComment.*` call.
//
// Deliberately mirrors lib/profile-comments.ts closely rather than
// generalizing the two into one shared module — see schema.prisma's
// comment on the ProjectComment model for why a shared table/abstraction
// isn't worth it for exactly two comment targets. What *is* reused
// directly, not re-declared: `toFollowListEntry` (the author shape) and
// `MAX_COMMENT_LENGTH` (the same 1000-char limit, imported from
// lib/profile-comments.ts so the two can never drift apart).
export { MAX_COMMENT_LENGTH };

// Same shape as lib/profile-comments.ts's ProfileCommentAuthor — both are
// just FollowListEntry, the one "show a user publicly" shape this app
// already has (see lib/follows.ts's own comment on it).
export type ProjectCommentAuthor = FollowListEntry;

export interface ProjectReplyWithAuthor {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  author: ProjectCommentAuthor;
}

// Same "replies is a flat array of the reply shape, not recursively
// itself" reasoning as ProfileCommentWithAuthor — one level of nesting,
// encoded in the type, not just enforced by createProjectComment below.
export interface ProjectCommentWithAuthor {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  author: ProjectCommentAuthor;
  replies: ProjectReplyWithAuthor[];
}

type UserWithProfile = User & { profile: Profile | null };

function toReplyWithAuthor(
  row: ProjectComment & { author: UserWithProfile }
): ProjectReplyWithAuthor {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    authorId: row.authorId,
    author: toFollowListEntry(row.author),
  };
}

// Every top-level comment on `projectId`, newest first, with its replies
// (oldest first — natural conversation order) nested inline. Same query
// shape as getProfileComments.
type CommentRowWithReplies = ProjectComment & {
  author: UserWithProfile;
  replies: (ProjectComment & { author: UserWithProfile })[];
};

export async function getProjectComments(projectId: string): Promise<ProjectCommentWithAuthor[]> {
  const rows = await prisma.projectComment.findMany({
    where: { projectId, parentId: null },
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

export function getProjectCommentById(
  commentId: string
): Promise<(ProjectComment & { project: { authorId: string } }) | null> {
  return prisma.projectComment.findUnique({
    where: { id: commentId },
    include: { project: { select: { authorId: true } } },
  });
}

export interface CreateProjectCommentInput {
  content: string;
  /** Null for a top-level comment; the id of a top-level comment to
   * reply to otherwise. */
  parentId: string | null;
}

// Returns null for any invalid `parentId` — not found, belongs to a
// different project, or is itself a reply rather than a top-level
// comment. Same validation shape as createProfileComment.
export async function createProjectComment(
  projectId: string,
  authorId: string,
  input: CreateProjectCommentInput
): Promise<ProjectComment | null> {
  if (input.parentId) {
    const parent = await prisma.projectComment.findFirst({
      where: { id: input.parentId, projectId, parentId: null },
      select: { id: true },
    });
    if (!parent) return null;
  }

  return prisma.projectComment.create({
    data: {
      projectId,
      authorId,
      parentId: input.parentId,
      content: input.content,
    },
  });
}

// Scoped to `{ id, OR: [author, project owner] }` — same
// ownership-enforced-by-the-query-itself idiom as
// deleteProfileCommentIfAllowed, extended through the `project` relation
// (rather than a direct column, since ProjectComment has no second FK to
// User the way ProfileComment.profileUserId does — see the schema
// comment) to check "is this the project's author." Deleting a top-level
// comment cascades to its replies at the DB level.
export async function deleteProjectCommentIfAllowed(
  commentId: string,
  requesterId: string
): Promise<ProjectComment | null> {
  const where = {
    id: commentId,
    OR: [{ authorId: requesterId }, { project: { authorId: requesterId } }],
  };

  const comment = await prisma.projectComment.findFirst({ where });
  if (!comment) return null;

  const result = await prisma.projectComment.deleteMany({ where });
  if (result.count === 0) return null;

  return comment;
}
