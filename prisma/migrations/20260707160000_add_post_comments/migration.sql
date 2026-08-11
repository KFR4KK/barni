-- Phase 8.1 — Post Comments
--
-- One new enum value (additive, nothing existing is touched or
-- reordered) plus one new table, mirroring ProjectComment's own
-- migration. See schema.prisma's comment on the PostComment model for
-- why this is its own table rather than reusing ProjectComment.
ALTER TYPE "NotificationType" ADD VALUE 'POST_COMMENT';

CREATE TABLE "PostComment" (
    "id"        TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postId"    TEXT NOT NULL,
    "authorId"  TEXT NOT NULL,
    "parentId"  TEXT,

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- Main read pattern: "list all comments on this post" (combined with
-- `parentId IS NULL` at the query layer to fetch just the top-level
-- ones — see lib/post-comments.ts's getPostComments).
CREATE INDEX "PostComment_postId_idx" ON "PostComment"("postId");
-- FK-column indexes, same convention as every other model in this schema.
CREATE INDEX "PostComment_authorId_idx" ON "PostComment"("authorId");
CREATE INDEX "PostComment_parentId_idx" ON "PostComment"("parentId");

ALTER TABLE "PostComment"
  ADD CONSTRAINT "PostComment_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostComment"
  ADD CONSTRAINT "PostComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostComment"
  ADD CONSTRAINT "PostComment_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "PostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
