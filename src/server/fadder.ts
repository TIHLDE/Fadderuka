/**
 * Who owes money for fadderuka — and, just as importantly, who never does.
 *
 * Only fadderbarn pay. Faddere are by definition students in their second year
 * or later, so the study cohort on the TIHLDE profile is what separates the
 * two groups. `User.klasse` holds Lepton's STUDYYEAR group name, which is the
 * ADMISSION YEAR as a string ("2026") — not an ordinal like "1. klasse". A
 * user admitted before the current fadderuke cohort is therefore in 2. klasse
 * or higher and can never be a fadderbarn.
 *
 * Four signals feed the decision, in priority order:
 *   1. `fadderOverride` — a manual admin decision, which always wins.
 *   2. A FADDER role in a faddergruppe — explicit, and covers the rare fadder
 *      whose cohort data is missing or wrong.
 *   3. A captured payment — proof, not a guess. `payment.initiatePayment`
 *      refuses exempt users outright, so money having changed hands means this
 *      user was on the paying side when it did. That outranks the cohort,
 *      which is only ever an inference from an admission year.
 *   4. The study cohort — the automatic path, which is what makes a fadder
 *      exempt from their very first login, before any admin has touched them.
 *
 * Deliberately fails towards "pays" when the cohort is unknown: a brand-new
 * student self-registering has no year group yet (`class: null` in
 * `tihldeCreateUser`), and that is exactly the fadderbarn case. A fadder who
 * lands here anyway is one admin click away from being fixed, and can never be
 * charged in the meantime — `payment.initiatePayment` refuses exempt users.
 */

import { env } from "~/env";

/** Lowest admission year we'll believe; anything older is bad data, not a cohort. */
const MIN_PLAUSIBLE_COHORT_YEAR = 2000;
/** Highest admission year we'll believe, guarding against typos like "20265". */
const MAX_PLAUSIBLE_COHORT_YEAR = 2100;

/**
 * Month (0-indexed) from which the new cohort is considered to have started.
 * The academic year — and fadderuka itself — starts in August, so from July
 * onwards "this year's" cohort is the new one. Before July, students admitted
 * last year are still in their first year and still owe money.
 */
const NEW_COHORT_FROM_MONTH = 6; // July

/**
 * The admission year of the students fadderuka is being run for, i.e. this
 * year's 1. klasse. Everyone admitted earlier is 2. klasse or higher.
 *
 * `FADDERUKE_COHORT_YEAR` pins it explicitly, which is what FadderKom should
 * set each year: it removes any dependence on the server clock at the exact
 * moment money is on the line. Without it we fall back to the calendar.
 */
export function currentCohortYear(
  now: Date = new Date(),
  override: string | undefined = env.FADDERUKE_COHORT_YEAR,
): number {
  const pinned = parseCohortYear(override ?? null);
  if (pinned !== null) return pinned;
  return cohortYearFromCalendar(now);
}

/**
 * The cohort year implied by the calendar alone, ignoring any pinned value.
 * Split out so the fallback stays directly testable — passing `undefined` to
 * `currentCohortYear` re-triggers its default and reads the environment again.
 */
export function cohortYearFromCalendar(now: Date): number {
  const year = now.getFullYear();
  return now.getMonth() >= NEW_COHORT_FROM_MONTH ? year : year - 1;
}

/**
 * Read an admission year out of a `klasse` value, or null when it isn't one.
 *
 * Lepton's STUDYYEAR groups are named by the plain year ("2026"), but the field
 * is free-form text on our side, so anything that isn't a plausible four-digit
 * year is treated as unknown rather than coerced.
 */
export function parseCohortYear(klasse: string | null | undefined): number | null {
  if (typeof klasse !== "string") return null;

  const match = /^\s*(\d{4})\s*$/.exec(klasse);
  if (!match?.[1]) return null;

  const year = Number(match[1]);
  if (year < MIN_PLAUSIBLE_COHORT_YEAR || year > MAX_PLAUSIBLE_COHORT_YEAR) {
    return null;
  }
  return year;
}

/**
 * Whether the cohort puts this user in their second year or later — the
 * baseline requirement for being a fadder. Unknown cohorts return false, which
 * keeps a self-registering new student on the paying side.
 */
export function isSecondYearOrLater(
  klasse: string | null | undefined,
  cohortYear: number = currentCohortYear(),
): boolean {
  const year = parseCohortYear(klasse);
  if (year === null) return false;
  return year < cohortYear;
}

export interface DeriveFadderInput {
  /** Manual admin decision; `null` means derive. */
  fadderOverride?: boolean | null;
  /** TIHLDE STUDYYEAR group name, i.e. the admission year. */
  klasse?: string | null;
  /** Whether the user holds a FADDER role in any faddergruppe. */
  hasFadderMembership?: boolean;
  /** Whether money has actually changed hands for this user. */
  hasPaid?: boolean;
  cohortYear?: number;
}

/** Resolve the four signals into the single `isFadder` fact we persist. */
export function deriveIsFadder({
  fadderOverride = null,
  klasse = null,
  hasFadderMembership = false,
  hasPaid = false,
  cohortYear = currentCohortYear(),
}: DeriveFadderInput): boolean {
  if (fadderOverride != null) return fadderOverride;
  if (hasFadderMembership) return true;
  // Someone who paid was demonstrably a fadderbarn. Letting the cohort
  // override that is how a paying student gets silently reclassified as
  // exempt — and then looks, to an admin reading the payment overview, like a
  // fadder owed a refund. This is the concrete case: a student starting a
  // 2-year continuation like Digital transformasjon keeps their bachelor
  // admission year, so the cohort insists they are in 2. klasse or later.
  if (hasPaid) return false;
  return isSecondYearOrLater(klasse, cohortYear);
}

/**
 * The single predicate every payment guard uses: does this user owe nothing?
 *
 * Admins run the app and have never paid; faddere are not customers at all.
 * Keeping both behind one function is what stops the two rules drifting apart
 * between the paywall, the tRPC procedures and the admin reporting.
 */
export function isPaymentExempt(user: {
  isAdmin?: boolean | null;
  isFadder?: boolean | null;
}): boolean {
  return user.isAdmin === true || user.isFadder === true;
}

/**
 * Whether the user may see the app's content.
 *
 * Exempt users are in without paying; everyone else needs the verification a
 * captured payment (or an admin) grants them.
 *
 * `hasPaid` counts on its own, and that is the point: the two flags are set
 * together when Vipps captures, but a payment moved between accounts by hand
 * sets only `hasPaid`. That left the user locked out of the app while the
 * payment overlay — which hides itself the moment `hasPaid` is true — rendered
 * nothing, i.e. a completely blank page with only header and footer. Money
 * having changed hands is the strongest signal we have; it must never be the
 * thing that produces less access than no payment at all.
 */
export function hasAppAccess(user: {
  isAdmin?: boolean | null;
  isFadder?: boolean | null;
  isVerified?: boolean | null;
  hasPaid?: boolean | null;
}): boolean {
  return (
    isPaymentExempt(user) || user.isVerified === true || user.hasPaid === true
  );
}
