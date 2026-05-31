-- AlterTable
ALTER TABLE "User" ADD COLUMN     "favoriteActorId" INTEGER,
ADD COLUMN     "favoriteContent" JSONB,
ADD COLUMN     "favoriteDirectorId" INTEGER;
