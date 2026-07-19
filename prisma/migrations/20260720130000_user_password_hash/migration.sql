-- Local password hash for users who self-registered while their TIHLDE
-- account awaits approval. Cleared on the first successful TIHLDE login.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
