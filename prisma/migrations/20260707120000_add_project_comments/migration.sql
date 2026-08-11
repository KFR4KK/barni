-- Phase 8.1 — Project Comments
--
-- New table only — no existing table is touched. Mirrors
-- 20260706200000_add_profile_comments/migration.sql's ProfileComment
-- table almost exactly; the one structural difference is `projectId`
-- (FK to Project) in place of `profileUserId` (FK to User) — see
-- schema.prisma's comment on the ProjectComment model for why.
CREATE TABLE "ProjectComment" (
    "id"         TEXT NOT NULL,
    "content"    TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    "projectId"  TEXT NOT NULL,
    "authorId"   TEXT NOT NULL,
    "parentId"   TEXT,

    CONSTRAINT "ProjectComment_pkey" PRIMARY KEY ("id")
);

-- Main read pattern: "list all comments on this project" (combined with
-- parentId IS NULL to get just the top-level ones).
CREATE INDEX "ProjectComment_projectId_idx" ON "ProjectComment"("projectId");
-- FK-column indexes, same convention as ProfileComment's migration.
CREATE INDEX "ProjectComment_authorId_idx" ON "ProjectComment"("authorId");
CREATE INDEX "ProjectComment_parentId_idx" ON "ProjectComment"("parentId");

ALTER TABLE "ProjectComment"
  ADD CONSTRAINT "ProjectComment_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectComment"
  ADD CONSTRAINT "ProjectComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Self-relation: a reply's parentId points at a top-level comment's id.
-- Cascade so deleting a top-level comment removes its replies for free —
-- application code (lib/project-comments.ts) is what actually enforces
-- "only one level," this constraint just cleans up children on delete.
ALTER TABLE "ProjectComment"
  ADD CONSTRAINT "ProjectComment_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "ProjectComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
