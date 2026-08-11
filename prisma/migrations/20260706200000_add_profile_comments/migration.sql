-- Phase 7.1 — Profile Comments
--
-- New table only — no existing table is touched.
CREATE TABLE "ProfileComment" (
    "id"            TEXT NOT NULL,
    "content"       TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "profileUserId" TEXT NOT NULL,
    "authorId"      TEXT NOT NULL,
    "parentId"      TEXT,

    CONSTRAINT "ProfileComment_pkey" PRIMARY KEY ("id")
);

-- Main read pattern: "list all comments on this profile" (combined with
-- parentId IS NULL to get just the top-level ones).
CREATE INDEX "ProfileComment_profileUserId_idx" ON "ProfileComment"("profileUserId");
-- FK-column indexes, same convention as Follow/ProjectImage's migrations.
CREATE INDEX "ProfileComment_authorId_idx" ON "ProfileComment"("authorId");
CREATE INDEX "ProfileComment_parentId_idx" ON "ProfileComment"("parentId");

ALTER TABLE "ProfileComment"
  ADD CONSTRAINT "ProfileComment_profileUserId_fkey"
  FOREIGN KEY ("profileUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfileComment"
  ADD CONSTRAINT "ProfileComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Self-relation: a reply's parentId points at a top-level comment's id.
-- Cascade so deleting a top-level comment removes its replies for free —
-- application code (lib/profile-comments.ts) is what actually enforces
-- "only one level," this constraint just cleans up children on delete.
ALTER TABLE "ProfileComment"
  ADD CONSTRAINT "ProfileComment_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "ProfileComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
