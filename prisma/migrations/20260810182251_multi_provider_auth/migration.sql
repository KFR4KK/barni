/*
  Warnings:

  - You are about to drop the column `slug` on the `Profile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Profile_slug_key";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "showOnProfile" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT,
ALTER COLUMN "discordId" DROP NOT NULL,
ALTER COLUMN "username" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
