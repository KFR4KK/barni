-- Phase 7.3 — Project Likes
--
-- New table only — no existing table is touched, and no count/boolean
-- column is added to "Project" (the like count is always derived from
-- this table at read time — see lib/project-likes.ts).
CREATE TABLE "ProjectLike" (
    "id"        TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,

    CONSTRAINT "ProjectLike_pkey" PRIMARY KEY ("id")
);

-- One user can only like a given project once — enforced at the DB
-- level, not just checked in application code, so a race between two
-- concurrent toggle requests can never create a duplicate like.
CREATE UNIQUE INDEX "ProjectLike_projectId_userId_key" ON "ProjectLike"("projectId", "userId");

-- Main read pattern: "how many likes does this project have" / "list
-- likes for this project".
CREATE INDEX "ProjectLike_projectId_idx" ON "ProjectLike"("projectId");
-- FK-column index, same convention as every other model in this schema.
CREATE INDEX "ProjectLike_userId_idx" ON "ProjectLike"("userId");

ALTER TABLE "ProjectLike"
  ADD CONSTRAINT "ProjectLike_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectLike"
  ADD CONSTRAINT "ProjectLike_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
