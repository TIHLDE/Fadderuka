-- Marks an admin-issued one-time password, so the user is prompted to replace
-- it with one of their own instead of keeping the generated string.
ALTER TABLE "User" ADD COLUMN "passwordIsTemporary" BOOLEAN NOT NULL DEFAULT false;
