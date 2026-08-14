import type { Post } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toFollowListEntry, type FollowListEntry } from "@/lib/follows";

// Phase 8.0 — Posts Foundation. Same role as lib/projects.ts and
// lib/profile-comments.ts: the one place that talks to the Post table —
// no Route Handler or page issues its own inline `prisma.post.*` call.

export const MAX_POST_CONTENT_LENGTH = 2000;
export const MIN_POST_CONTENT_LENGTH = 1;

export function getPostById(id: string): Promise<Post | null> {
  return prisma.post.findUnique({ where: { id } });
}

// The shape components/posts/PostCard.tsx actually renders: a Post plus
// its author resolved to FollowListEntry — the same "show a user
// publicly" shape lib/follows.ts already centralizes for
// FollowListItem/CommentItem, reused here rather than redeclared, per
// this phase's brief ("максимально переиспользуй"). Using the full
// FollowListEntry (not just { username, displayName } the way
// lib/projects.ts's ProjectListItem does) is deliberate: PostCard needs
// an avatar and a profile link today, and a future Feed/search result
// will want the same membership badge FollowListItem already shows —
// no reason to grow this type later for that.
//
// Feed redesign — also carries likesCount/commentsCount (derived, same
// "count over the relation" rule as every other like/comment count in
// this app — see lib/project-likes.ts) and viewerHasLiked (null when
// there's no signed-in viewer to have liked anything).
export type PostWithAuthor = Post & {
  author: FollowListEntry;
  likesCount: number;
  commentsCount: number;
  viewerHasLiked: boolean;
};

const POST_LIST_INCLUDE = {
  user: { include: { profile: true } },
  _count: { select: { likes: true, comments: true } },
} as const;

type PostRow = Post & {
  user: Parameters<typeof toFollowListEntry>[0];
  _count: { likes: number; comments: number };
};

async function toPostsWithAuthor(rows: PostRow[], viewerId: string | null): Promise<PostWithAuthor[]> {
  // One query for "which of these posts has the viewer liked", not one
  // findUnique per row — same batching lib/tags.ts's getTagsForProjects
  // already does for its own "bulk load, not N+1" reason.
  const likedPostIds = viewerId
    ? new Set(
        (
          await prisma.postLike.findMany({
            where: { userId: viewerId, postId: { in: rows.map((row) => row.id) } },
            select: { postId: true },
          })
        ).map((like) => like.postId)
      )
    : new Set<string>();

  return rows.map((row) => {
    const { user, _count, ...post } = row;
    return {
      ...post,
      author: toFollowListEntry(user),
      likesCount: _count.likes,
      commentsCount: _count.comments,
      viewerHasLiked: likedPostIds.has(post.id),
    };
  });
}

// One user's posts, newest first. This phase's only caller is the
// profile page (components/posts/PostsSection.tsx via
// app/members/[slug]/page.tsx), but nothing here is profile-specific:
// a future global Feed is the same query with the `where: { userId }`
// dropped (see this model's own comment in schema.prisma about the
// index already covering that), and a search feature would filter this
// same include by `content` instead of `userId` — neither needs a new
// data-layer function, just a new caller of a very similar query.
export async function getPostsByUserId(userId: string, viewerId: string | null = null): Promise<PostWithAuthor[]> {
  const rows = await prisma.post.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: POST_LIST_INCLUDE,
  });
  return toPostsWithAuthor(rows, viewerId);
}

// Phase 8.2 — Feed (MVP). The "future global Feed" getPostsByUserId's own
// comment above already anticipated: the exact same query and include,
// just without the `where: { userId }` filter — still served by the same
// `@@index([userId, createdAt])` on Post (its leading `userId` column
// isn't used here, but the trailing `createdAt` still lets Postgres walk
// the index in the requested order). Lives here, not inline in
// lib/feed.ts, per this codebase's convention that only the module
// owning a table issues `prisma.post.*` calls — lib/feed.ts calls this
// the same way app/members/[slug]/page.tsx calls getPostsByUserId.
export async function getAllPosts(viewerId: string | null = null): Promise<PostWithAuthor[]> {
  const rows = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: POST_LIST_INCLUDE,
  });
  return toPostsWithAuthor(rows, viewerId);
}

export interface CreatePostInput {
  content: string;
  imageUrl: string | null;
}

export function createPost(userId: string, input: CreatePostInput): Promise<Post> {
  return prisma.post.create({
    data: { userId, content: input.content, imageUrl: input.imageUrl },
  });
}

export interface UpdatePostInput {
  content: string;
  imageUrl: string | null;
}

// Scoped as an `updateMany` on `{ id, userId }`, not a plain `update` on
// `{ id }` with a separate ownership check beforehand — ownership
// enforced by the query itself, at the DB layer, the same idiom
// lib/projects.ts's updateProject and lib/profile-comments.ts already
// use. Returns null if the post doesn't exist or isn't owned by
// `userId`; the PATCH route turns that into a 403/404, never a silent
// success.
export async function updatePost(
  postId: string,
  userId: string,
  input: UpdatePostInput
): Promise<Post | null> {
  const result = await prisma.post.updateMany({
    where: { id: postId, userId },
    data: { content: input.content, imageUrl: input.imageUrl },
  });

  if (result.count === 0) return null;
  return prisma.post.findUnique({ where: { id: postId } });
}

// Same ownership-enforced-by-the-query-itself idiom as updatePost, and
// same "return the row as it was, not just a boolean" reasoning as
// lib/projects.ts's deleteProjectIfOwned: the caller (the DELETE route)
// needs `imageUrl` in hand *after* the row is gone from the database, to
// clean up the corresponding Storage object (if it's one of ours — see
// lib/storage.ts's isOwnStorageUrl).
export async function deletePostIfOwned(postId: string, userId: string): Promise<Post | null> {
  const post = await prisma.post.findFirst({ where: { id: postId, userId } });
  if (!post) return null;

  const result = await prisma.post.deleteMany({ where: { id: postId, userId } });
  if (result.count === 0) return null;

  return post;
}

// Feed redesign — fired once per card from the client as it scrolls
// into view (see components/posts/PostCard.tsx's IntersectionObserver),
// not on a page visit the way Project.viewCount is: posts have no
// dedicated detail page of their own to increment on visiting.
export async function incrementPostViewCount(postId: string): Promise<void> {
  await prisma.post.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
  });
}
