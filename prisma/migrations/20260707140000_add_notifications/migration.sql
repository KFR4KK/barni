-- Phase 7.4 — Notifications Foundation
--
-- New table + new enum only — no existing table is touched. See
-- schema.prisma's comment on the Notification model for why this one
-- table is polymorphic (via `type` + an untyped `entityId`) where
-- ProfileComment/ProjectComment deliberately are not.
CREATE TYPE "NotificationType" AS ENUM (
    'FOLLOW',
    'PROFILE_COMMENT',
    'PROJECT_COMMENT',
    'COMMENT_REPLY',
    'PROJECT_LIKE'
);

CREATE TABLE "Notification" (
    "id"          TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read"        BOOLEAN NOT NULL DEFAULT false,
    "type"        "NotificationType" NOT NULL,
    "entityId"    TEXT,
    "recipientId" TEXT NOT NULL,
    "actorId"     TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Main read pattern: "list my notifications, newest first"; also a
-- usable prefix for "how many are unread" (recipientId + read = false),
-- so no separate index is needed for the unread count.
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");
-- FK-column index, same convention as every other model in this schema.
CREATE INDEX "Notification_actorId_idx" ON "Notification"("actorId");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
