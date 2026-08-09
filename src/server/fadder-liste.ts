/**
 * Recognising a fadder from FadderKom's sign-up list at login time.
 *
 * `scripts/import-faddere.ts` loads the list into `FadderListEntry`; this is
 * the read side, called once per login from the auth callback. A hit pins
 * `fadderOverride` to true, which `deriveIsFadder` then honours above every
 * other signal — so the exemption survives later logins without the list
 * having to be consulted again.
 *
 * The list itself is treated as authoritative: FadderKom decides who is a
 * fadder, and this file's only job is to decide *which user row* a given line
 * of that list belongs to. That framing is what sets the strictness below —
 * the risk is never "is the list wrong", it is "did we pick the right person".
 */

import {
  type FadderListEntryLike,
  type FadderListProfile,
  matchFadderList,
  normaliseFadderName,
} from "~/lib/fadder-liste";
import { db } from "~/server/db";

export {
  type FadderListEntryLike,
  type FadderListProfile,
  type FadderListVerdict,
  matchFadderList,
} from "~/lib/fadder-liste";

/**
 * The login-time entry point: is this person on the list?
 *
 * Fetches only the rows that could plausibly match rather than the whole list,
 * and logs every near miss. A refusal that nobody can see is how a fadder ends
 * up at a payment prompt with no explanation, so the reasons are written out
 * in full for FadderKom to work through.
 */
export async function isOnFadderList(
  profile: FadderListProfile,
): Promise<boolean> {
  if (!profile.name) return false;

  const email = profile.email?.trim().toLowerCase() ?? null;
  const parts = [...normaliseFadderName(profile.name).split(" ")].filter(Boolean);
  if (parts.length === 0) return false;

  /**
   * Narrow in SQL on the rarest name part — the surname is usually last after
   * sorting, but any single part is enough to cut 159 rows to a handful, and
   * `nameIsSubset` does the real work in `matchFadderList`.
   */
  const candidates = await db.fadderListEntry.findMany({
    where: {
      OR: [
        ...parts.map((p) => ({ normalisedName: { contains: p } })),
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
  const who = `${profile.name} <${profile.email ?? "-"}>`;

  if (verdict.matched) {
    console.info(`[fadderliste] ${who} satt som fadder — "${verdict.entry.name}".`);
    return true;
  }

  if (verdict.reason !== "ingen-kandidat" && verdict.entry) {
    const e = verdict.entry;
    console.warn(
      `[fadderliste] ${who} ligner "${e.name}" på lista, men ${verdict.reason} ` +
        `stemmer ikke (lista: ${e.studieretning ?? "-"} / ${e.kull ?? "-"}, ` +
        `profil: ${profile.studieretning ?? "-"} / ${profile.klasse ?? "-"}). ` +
        `Ikke satt som fadder — sjekk manuelt i adminpanelet.`,
    );
  }
  return false;
}
