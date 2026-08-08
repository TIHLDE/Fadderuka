/**
 * Recognising a fadder from FadderKom's sign-up list at login time.
 *
 * `scripts/import-faddere.ts` loads the list into `FadderListEntry`; this is
 * the read side, called once per login from the auth callback. A hit pins
 * `fadderOverride` to true, which `deriveIsFadder` then honours above every
 * other signal — so the exemption survives later logins without the list
 * having to be consulted again.
 */

import { normaliseFadderName } from "~/lib/fadder-liste";
import { findMajor } from "~/lib/majors";
import { db } from "~/server/db";

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
  | { matched: false }
  | {
      matched: true;
      entry: FadderListEntryLike;
      /** How the row was found, for the log line. */
      via: "email" | "name";
      /** Null when either side had no usable programme to compare. */
      studieretningMatches: boolean | null;
      /** Advisory only. Null when either side had no usable cohort. */
      kullMatches: boolean | null;
    }
  | {
      matched: false;
      /** A name hit whose programme contradicted the list — deliberately refused. */
      rejected: { entry: FadderListEntryLike; reason: "studieretning" };
    };

/**
 * Decide whether a signing-in user is on the fadder list.
 *
 * Two things are load-bearing about how strict this is:
 *
 * The programme is a *veto*, not a requirement. When both sides name a
 * programme and they disagree, this is not the person on the list and the
 * exemption is refused. When either side is silent — a profile without a study
 * programme, or a sheet row whose abbreviation we could not resolve — there is
 * nothing to contradict, and a name hit stands on its own. Requiring a
 * programme we might not have would turn missing data into a payment demand.
 *
 * The cohort never blocks. The sheet asks which year the applicant is in when
 * she applies, months before fadderuka and self-reported; the twelve Digital
 * transformasjon faddere in the spring 2026 list answer "4. klasse" while
 * their profile still carries the bachelor admission year. Reported, not
 * enforced.
 */
export function matchFadderList(
  entries: FadderListEntryLike[],
  profile: FadderListProfile,
): FadderListVerdict {
  const email = profile.email?.trim().toLowerCase() ?? null;
  const normalised = profile.name ? normaliseFadderName(profile.name) : null;

  let entry: FadderListEntryLike | undefined;
  let via: "email" | "name" = "email";

  if (email) {
    entry = entries.find((e) => e.email?.toLowerCase() === email);
  }
  if (!entry && normalised) {
    entry = entries.find((e) => e.normalisedName === normalised);
    via = "name";
  }
  if (!entry) return { matched: false };

  const listedMajor = findMajor(entry.studieretning);
  const profileMajor = findMajor(profile.studieretning);
  const studieretningMatches =
    listedMajor && profileMajor ? listedMajor === profileMajor : null;

  if (studieretningMatches === false) {
    return { matched: false, rejected: { entry, reason: "studieretning" } };
  }

  const profileKull = profile.klasse ? Number.parseInt(profile.klasse, 10) : NaN;
  const kullMatches =
    entry.kull !== null && Number.isFinite(profileKull)
      ? entry.kull === profileKull
      : null;

  return { matched: true, entry, via, studieretningMatches, kullMatches };
}

/**
 * The login-time entry point: is this person on the list?
 *
 * Fetches only the two rows that could possibly match rather than the whole
 * list, and logs every outcome that is not a clean miss — a refused programme,
 * an unverifiable one, a cohort that disagrees. FadderKom reads those lines to
 * find the rows worth fixing by hand; nothing here is silent.
 */
export async function isOnFadderList(
  profile: FadderListProfile,
): Promise<boolean> {
  const email = profile.email?.trim().toLowerCase() ?? null;
  const normalisedName = profile.name
    ? normaliseFadderName(profile.name)
    : null;
  if (!email && !normalisedName) return false;

  const candidates = await db.fadderListEntry.findMany({
    where: {
      OR: [
        ...(normalisedName ? [{ normalisedName }] : []),
        ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      normalisedName: true,
      studieretning: true,
      kull: true,
      email: true,
    },
  });
  if (candidates.length === 0) return false;

  const verdict = matchFadderList(candidates, profile);
  const who = `${profile.name ?? "?"} <${profile.email ?? "-"}>`;

  if (!verdict.matched) {
    if ("rejected" in verdict) {
      console.warn(
        `[fadderliste] ${who} står på lista som "${verdict.rejected.entry.name}", ` +
          `men linja stemmer ikke (liste: ${verdict.rejected.entry.studieretning ?? "-"}, ` +
          `profil: ${profile.studieretning ?? "-"}). Ikke satt som fadder — sjekk manuelt.`,
      );
    }
    return false;
  }

  if (verdict.studieretningMatches === null) {
    console.info(
      `[fadderliste] ${who} matchet på ${verdict.via}, men linja kunne ikke bekreftes ` +
        `(liste: ${verdict.entry.studieretning ?? "-"}, profil: ${profile.studieretning ?? "-"}).`,
    );
  }
  if (verdict.kullMatches === false) {
    console.info(
      `[fadderliste] ${who} satt som fadder, men kull avviker ` +
        `(liste: ${verdict.entry.kull ?? "-"}, profil: ${profile.klasse ?? "-"}).`,
    );
  }

  console.info(`[fadderliste] ${who} satt som fadder via ${verdict.via}.`);
  return true;
}
