-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('ANNOUNCEMENT', 'CHAT');

-- AlterTable
ALTER TABLE "GroupMessage" ADD COLUMN     "channel" "MessageChannel" NOT NULL DEFAULT 'ANNOUNCEMENT';
