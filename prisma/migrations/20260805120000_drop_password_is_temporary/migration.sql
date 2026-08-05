-- Engangspassord-ordningen er fjernet: admin utsteder ikke lenger midlertidige
-- passord, så flagget som ba brukeren bytte det ut har ingen lesere igjen.
-- Brukere som allerede har et admin-utstedt passord beholder det som sitt eget.
ALTER TABLE "User" DROP COLUMN "passwordIsTemporary";
