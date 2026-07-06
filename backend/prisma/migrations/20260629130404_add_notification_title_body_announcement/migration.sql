-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ADMIN_ANNOUNCEMENT';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "body" TEXT,
ADD COLUMN     "title" TEXT;
