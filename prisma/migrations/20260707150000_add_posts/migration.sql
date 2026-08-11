-- Phase 8.0 — Posts Foundation
--
-- New table only — no existing table is touched. See schema.prisma's
-- comment on the Post model for why this is a separate table rather
-- than folded into Project or a shared "Content" model.
CREATE TABLE "Post" (
    "id"        TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content"   TEXT NOT NULL,
    "imageUrl"  TEXT,
    "userId"    TEXT NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- Main read pattern: "list this user's posts, newest first" — and
-- already shaped for a future feed query dropping the userId filter
-- (see the model's own comment in schema.prisma).
CREATE INDEX "Post_userId_createdAt_idx" ON "Post"("userId", "createdAt");

ALTER TABLE "Post"
  ADD CONSTRAINT "Post_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
