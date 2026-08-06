/*
  Warnings:

  - You are about to drop the column `tihldeToken` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `PasswordResetToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "tihldeToken",
ADD COLUMN     "photonAccessToken" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordHash",
ADD COLUMN     "allergy" TEXT;

-- DropTable
DROP TABLE "PasswordResetToken";
