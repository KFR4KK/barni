-- Phase 12 — Profile Redesign. Every new Profile column is nullable or
-- has a default, and MediaType defaults every existing row's bannerType
-- to IMAGE (the only kind a banner could have been before this phase) —
-- no existing data is touched or reinterpreted. See prisma/schema.prisma's
-- comments on each field for the full reasoning.

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'GIF', 'VIDEO');

-- AlterTable
ALTER TABLE "Profile"
  ADD COLUMN "bannerType" "MediaType" NOT NULL DEFAULT 'IMAGE',
  ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "education" TEXT,
  ADD COLUMN "birthday" TIMESTAMP(3),
  ADD COLUMN "musicUrl" TEXT,
  ADD COLUMN "musicTitle" TEXT,
  ADD COLUMN "musicArtist" TEXT,
  ADD COLUMN "widgetMedia" TEXT,
  ADD COLUMN "widgetMediaType" "MediaType",
  ADD COLUMN "enabledWidgets" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "widgetContent" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "ProfileCommentLike" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ProfileCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileCommentLike_commentId_userId_key" ON "ProfileCommentLike"("commentId", "userId");

-- CreateIndex
CREATE INDEX "ProfileCommentLike_userId_idx" ON "ProfileCommentLike"("userId");

-- AddForeignKey
ALTER TABLE "ProfileCommentLike" ADD CONSTRAINT "ProfileCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ProfileComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileCommentLike" ADD CONSTRAINT "ProfileCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
