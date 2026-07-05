-- Phase 4 — Discord Server Integration
--
-- Adds Discord guild-membership sync state to Profile. All columns get
-- safe defaults so existing rows (every current Profile, claimed or not)
-- are valid immediately without a backfill step: unclaimed profiles and
-- profiles that haven't been re-synced yet simply read as
-- "not a known member", not as an error state.
ALTER TABLE "Profile"
  ADD COLUMN "serverMember"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "serverJoinedAt"  TIMESTAMP(3),
  ADD COLUMN "discordRoles"    JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "discordSyncedAt" TIMESTAMP(3);
