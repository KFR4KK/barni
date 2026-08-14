import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Feed redesign. Same role and same shape as lib/project-likes.ts — see
// that file's own comments for the full reasoning behind each choice
// (derived count instead of a stored column, deleteMany for idempotent
// unlike, catching P2002 on a like race) — not repeated here.

export async function hasUserLikedPost(postId: string, userId: string): Promise<boolean> {
  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  return existing !== null;
}

export function getPostLikesCount(postId: string): Promise<number> {
  return prisma.postLike.count({ where: { postId } });
}

export interface TogglePostLikeResult {
  liked: boolean;
  likes: number;
}

export async function togglePostLike(postId: string, userId: string): Promise<TogglePostLikeResult> {
  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    await prisma.postLike.deleteMany({ where: { postId, userId } });
  } else {
    try {
      await prisma.postLike.create({ data: { postId, userId } });
    } catch (error) {
      const alreadyLiked =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!alreadyLiked) {
        throw error;
      }
    }
  }

  const likes = await getPostLikesCount(postId);
  return { liked: !existing, likes };
}
