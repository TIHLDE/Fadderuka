-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "tihldeToken" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerified",
ADD COLUMN     "tihldeUserId" TEXT NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Verification";

-- CreateIndex
CREATE UNIQUE INDEX "User_tihldeUserId_key" ON "User"("tihldeUserId");

