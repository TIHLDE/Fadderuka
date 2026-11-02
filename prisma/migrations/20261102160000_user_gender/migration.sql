-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MANN', 'KVINNE', 'ANNET');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" "Gender";
