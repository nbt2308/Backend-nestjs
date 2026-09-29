/*
  Warnings:

  - You are about to drop the column `videoUrl` on the `Lesson` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VideoUploadStatus" AS ENUM ('PENDING', 'UPLOADING', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "videoUrl",
ADD COLUMN     "videoError" TEXT,
ADD COLUMN     "videoStatus" "VideoUploadStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "YoutubeCredential" (
    "id" SERIAL NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT NOT NULL,
    "expiryDate" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YoutubeCredential_pkey" PRIMARY KEY ("id")
);
