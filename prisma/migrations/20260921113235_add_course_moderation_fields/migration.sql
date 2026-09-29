-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "deletedReason" TEXT,
ADD COLUMN     "reason_rejected" TEXT;

-- CreateIndex
CREATE INDEX "Course_approvedById_idx" ON "Course"("approvedById");

-- CreateIndex
CREATE INDEX "Course_deletedAt_idx" ON "Course"("deletedAt");

-- CreateIndex
CREATE INDEX "Course_deletedById_idx" ON "Course"("deletedById");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
