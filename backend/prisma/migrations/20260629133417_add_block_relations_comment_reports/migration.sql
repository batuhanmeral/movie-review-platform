-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "commentId" TEXT;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ReviewComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
