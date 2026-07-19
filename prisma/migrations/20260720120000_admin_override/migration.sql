-- Manual admin decision from the admin panel. NULL = derive from TIHLDE at login.
ALTER TABLE "User" ADD COLUMN "adminOverride" BOOLEAN;
