/**
 * Shared helpers for FadderKom's fadder sign-up list.
 *
 * The list lives in a Google Form export that `scripts/import-faddere.ts`
 * loads into `FadderListEntry`, and is read back on every login by
 * `src/app/api/auth/callback/route.ts`. Both sides have to agree on exactly
 * how a name is folded and how the form's class-year answer becomes an
 * admission year, so the rules live here rather than in either caller.
 */

import { findMajor } from "~/lib/majors";

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
    // æ/ø/å are letters, not accented vowels, so NFD leaves them intact and the
    // strip below would turn them into word breaks — "Kjærstad" becoming the
    // two fragments "kj" and "rstad". Fold them to their conventional ASCII
    // spellings first, which also makes "Kjaerstad" and "Kjærstad" the same
    // name rather than two.
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
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
 * The name as a set of parts, for subset matching.
 *
 * The form is filled in by hand and people leave out middle names the TIHLDE
 * profile carries — "Sivert Eikrem" against "Sivert Nygård Eikrem", thirteen
 * such rows in the spring 2026 list. Comparing the *sets* rather than the
 * joined string lets the profile carry extra parts the form did not.
 */
export function fadderNameParts(name: string): Set<string> {
  return new Set(normaliseFadderName(name).split(" ").filter(Boolean));
}

/** Every part the form gave us is present in the profile name. */
export function nameIsSubset(formName: string, profileName: string): boolean {
  const parts = fadderNameParts(formName);
  if (parts.size === 0) return false;
  const profile = fadderNameParts(profileName);
  return [...parts].every((p) => profile.has(p));
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

/** The subset of `FadderListEntry` the match needs; keeps this testable. */
export interface FadderListEntryLike {
  id: string;
  name: string;
  normalisedName: string;
  studieretning: string | null;
  kull: number | null;
  email: string | null;
}

export interface FadderListProfile {
  /** Full name from the TIHLDE profile — not user-typed, so it is trustworthy. */
  name: string | null;
  email: string | null;
  /** Study programme as TIHLDE spells it. */
  studieretning: string | null;
  /** Admission year from the TIHLDE profile, as a string ("2025"). */
  klasse: string | null;
}

export type FadderListVerdict =
  | { matched: true; entry: FadderListEntryLike }
  | {
      matched: false;
      /**
       * Why, so a near miss can be reported instead of vanishing. Everything
       * except `ingen-kandidat` means a name on the list pointed at this user
       * and something else disagreed — exactly the rows FadderKom should see.
       */
      reason: "ingen-kandidat" | "linje" | "kull" | "ufullstendig-profil" | "tvetydig";
      entry?: FadderListEntryLike;
    };

/**
 * Decide whether a signing-in user is the person named on a list row.
 *
 * All three fields must agree: name, study programme and cohort. Any one of
 * them alone is too weak to carry an identity — the list holds a hand-typed
 * name and a private e-mail address, neither of which is a key, and there are
 * two students called Sivert Eikrem, one a fadder and one a paying fadderbarn
 * on a different programme. Requiring all three is what makes writing to the
 * user record on the strength of a spreadsheet defensible: measured against
 * the whole list, all 74 unambiguous matches agreed on the cohort, and the
 * namesake failed on both programme and cohort.
 *
 * The deliberate cost is that a genuine fadder whose profile is incomplete or
 * disagrees gets refused. That is the failure worth having: a refusal shows up
 * as a fadder hitting a payment prompt and saying so, and is one admin click
 * to fix. A wrong match is silent, exempts the wrong person, and makes a
 * payment that was actually owed look like a refund.
 */
export function matchFadderList(
  entries: FadderListEntryLike[],
  profile: FadderListProfile,
): FadderListVerdict {
  if (!profile.name) return { matched: false, reason: "ingen-kandidat" };

  const email = profile.email?.trim().toLowerCase() ?? null;

  /**
   * Cast the net wide, then narrow on evidence. The name may be missing middle
   * names, and an exact e-mail hit is worth following even when the name was
   * written differently — but neither shortcut skips the checks below.
   */
  const candidates = entries.filter(
    (e) =>
      nameIsSubset(e.name, profile.name!) ||
      (email !== null && e.email?.toLowerCase() === email),
  );
  if (candidates.length === 0) return { matched: false, reason: "ingen-kandidat" };

  const profileMajor = findMajor(profile.studieretning);
  const profileKull = profile.klasse ? Number.parseInt(profile.klasse, 10) : NaN;
  if (!profileMajor || !Number.isFinite(profileKull)) {
    return {
      matched: false,
      reason: "ufullstendig-profil",
      entry: candidates[0],
    };
  }

  const sameMajor = candidates.filter(
    (e) => findMajor(e.studieretning) === profileMajor,
  );
  if (sameMajor.length === 0) {
    return { matched: false, reason: "linje", entry: candidates[0] };
  }

  const sameKull = sameMajor.filter((e) => e.kull === profileKull);
  if (sameKull.length === 0) {
    return { matched: false, reason: "kull", entry: sameMajor[0] };
  }

  /**
   * Two rows agreeing on name, programme and cohort means the list itself
   * cannot tell them apart, and neither can we. Refuse rather than pick.
   */
  if (sameKull.length > 1) {
    return { matched: false, reason: "tvetydig", entry: sameKull[0] };
  }

  return { matched: true, entry: sameKull[0]! };
}
