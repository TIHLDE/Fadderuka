-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('FADDER', 'FADDERBARN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "klasse" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "studieretning" TEXT;

-- CreateTable
CREATE TABLE "FadderGruppe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FadderGruppe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FadderGruppeMember" (
    "id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "gruppeId" TEXT NOT NULL,

    CONSTRAINT "FadderGruppeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "imageUrl" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "gruppeId" TEXT NOT NULL,

    CONSTRAINT "GroupMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FadderGruppeMember_userId_gruppeId_key" ON "FadderGruppeMember"("userId", "gruppeId");

-- AddForeignKey
ALTER TABLE "FadderGruppeMember" ADD CONSTRAINT "FadderGruppeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FadderGruppeMember" ADD CONSTRAINT "FadderGruppeMember_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "FadderGruppe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "FadderGruppe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

