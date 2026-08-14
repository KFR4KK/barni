-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "isUpdate" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Post_isUpdate_createdAt_idx" ON "Post"("isUpdate", "createdAt");
