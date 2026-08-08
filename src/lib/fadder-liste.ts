/**
 * Shared helpers for FadderKom's fadder sign-up list.
 *
 * The list lives in a Google Form export that `scripts/import-faddere.ts`
 * loads into `FadderListEntry`, and is read back on every login by
 * `src/app/api/auth/callback/route.ts`. Both sides have to agree on exactly
 * how a name is folded and how the form's class-year answer becomes an
 * admission year, so the rules live here rather than in either caller.
 */

/**
 * A name reduced to something two spellings of the same person share.
 *
 * Diacritics, hyphens and middle-name ordering are exactly where the form and
 * the TIHLDE profile disagree ("Alva Kjærstad-Leiner" vs "Alva Kjærstad
 * Leiner"), so fold them all away and compare the name parts as an unordered
 * set. In the spring 2026 list this collapses 159 rows to 159 distinct keys —
 * no collisions — which is what makes the name usable as a lookup key at all.
 */
export function normaliseFadderName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

/**
 * Turn the form's "Hvilken klasse går du?" answer into an admission year.
 *
 * The form asks which year the applicant is in *at the time they apply*, but
 * `User.klasse` — and the `studyStartYear` Photon hands us — is the admission
 * year. Someone in their first year during spring 2026 started in autumn 2025,
 * so the admission year is simply the sign-up year minus the class ordinal.
 *
 * The answers arrive as spreadsheet floats ("1.0", "4.0"), hence the parse.
 * Returns null for anything outside 1–6, which is bad data rather than a
 * cohort — the caller treats that as "no expectation" and not as a mismatch.
 */
export function admissionYearFromFormClass(
  classAnswer: string | null | undefined,
  signupYear: number,
): number | null {
  if (!classAnswer) return null;
  const ordinal = Number.parseFloat(classAnswer.replace(",", "."));
  if (!Number.isFinite(ordinal)) return null;
  const rounded = Math.round(ordinal);
  if (rounded < 1 || rounded > 6) return null;
  return signupYear - rounded;
}
