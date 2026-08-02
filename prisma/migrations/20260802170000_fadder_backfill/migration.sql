-- Backfill the fadder exemption for users who already exist.
--
-- Without this, an existing fadder stays on the paying side until their next
-- login re-derives the flag — and would be shown a payment prompt in the
-- meantime. Only the unambiguous case is handled here: anyone holding a FADDER
-- role in a faddergruppe. Cohort-based derivation needs this year's admission
-- year, which lives in the environment rather than in SQL, and is applied on
-- the next login for everyone else.
UPDATE "User" u
SET "isFadder" = true,
    "isVerified" = true
WHERE EXISTS (
    SELECT 1 FROM "FadderGruppeMember" m
    WHERE m."userId" = u.id AND m.role = 'FADDER'
);

-- Undo the old conflation of "is an admin" with "has paid".
--
-- Login used to grant admins `hasPaid = true` so they'd skip the paywall. That
-- made the field mean two different things, and left anyone later demoted from
-- admin looking permanently paid. Access now comes from the exemption instead,
-- so `hasPaid` can go back to meaning money actually changed hands — which is
-- true only where a captured payment exists.
UPDATE "User" u
SET "hasPaid" = false
WHERE u."hasPaid" = true
  AND u."isAdmin" = true
  AND NOT EXISTS (
    SELECT 1 FROM "Payment" p
    WHERE p."userId" = u.id AND p.status = 'CAPTURED'
);
