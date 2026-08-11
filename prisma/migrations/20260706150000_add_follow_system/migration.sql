-- Phase 5.1 — Follow System
--
-- New table only — no existing table is touched, so this migration is
-- purely additive and carries no data-loss or backfill risk.
CREATE TABLE "Follow" (
    "id"          TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followerId"  TEXT NOT NULL,
    "followingId" TEXT NOT NULL,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- Enforces "can't follow the same person twice" at the DB level (the API
-- route additionally treats a violation of this as a harmless no-op —
-- see app/api/follow/route.ts).
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- Powers "how many followers does this user have" (COUNT ... WHERE
-- "followingId" = $1), run on every profile-page view and every
-- follow/unfollow response.
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

ALTER TABLE "Follow"
  ADD CONSTRAINT "Follow_followerId_fkey"
  FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Follow"
  ADD CONSTRAINT "Follow_followingId_fkey"
  FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
