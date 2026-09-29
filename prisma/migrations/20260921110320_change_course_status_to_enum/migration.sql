/*
  Warnings:

  - The `status` column on the `Course` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED');

-- AlterEnum
ALTER TYPE "VideoUploadStatus" ADD VALUE 'DELETED';

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "status",
ADD COLUMN     "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "Course"("status");
