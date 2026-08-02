-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fadderOverride" BOOLEAN,
ADD COLUMN     "isFadder" BOOLEAN NOT NULL DEFAULT false;
