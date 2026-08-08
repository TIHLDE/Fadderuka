/**
 * Når fadderbarn får se faddergruppa si.
 *
 * Gruppene settes sammen lenge før fadderuka, og FadderKom vil ikke at
 * fadderbarna skal se hvem de havner sammen med før alt er klart — navnene
 * flytter seg helt til siste liten. Publiseringen er derfor én manuell bryter
 * for *alle* gruppene samtidig, ikke per gruppe eller per studieretning.
 *
 * Faddere og admins ser gruppene hele tiden: de er de som skal forberede seg,
 * og de vet allerede hvem som er i gruppa. Det er bare fadderbarna som venter.
 */

import type { PrismaClient } from "@prisma/client";
import type { MemberRole } from "@prisma/client";

/** Primærnøkkelen til den ene raden i `AppSetting`. */
export const APP_SETTING_ID = "singleton";

/**
 * Når fadderbarna får gruppene sine. Står ett sted fordi teksten gjentas på
 * forsiden og på /faddergruppe — flytter slippet seg, endres begge her.
 */
export const GRUPPE_RELEASE_LABEL = "på mandag";

/** Forklaringen fadderbarn får mens de venter, uansett hvor de leser den. */
export const GRUPPE_WAIT_DESCRIPTION =
  `Fadderkom setter fortsatt sammen gruppene, så du er ikke tildelt en ` +
  `faddergruppe enda. Alle fadderbarn får gruppa si ${GRUPPE_RELEASE_LABEL}.`;

type Db = Pick<PrismaClient, "appSetting">;

/** Når gruppene ble publisert, eller `null` hvis de fortsatt er skjult. */
export async function getGruppePublishedAt(db: Db): Promise<Date | null> {
  const setting = await db.appSetting.findUnique({
    where: { id: APP_SETTING_ID },
    select: { gruppePublishedAt: true },
  });
  return setting?.gruppePublishedAt ?? null;
}

/** Er gruppene sluppet til fadderbarna? Ingen rad = ikke publisert. */
export async function areGrupperPublished(db: Db): Promise<boolean> {
  return (await getGruppePublishedAt(db)) !== null;
}

/**
 * Slå publiseringen av eller på. Å publisere på nytt setter et nytt tidspunkt;
 * å skjule nullstiller det, slik at bryteren er helt reverserbar hvis noen
 * trykker for tidlig.
 */
export async function setGrupperPublished(
  db: Db,
  published: boolean,
  now: Date = new Date(),
): Promise<Date | null> {
  const gruppePublishedAt = published ? now : null;
  const setting = await db.appSetting.upsert({
    where: { id: APP_SETTING_ID },
    create: { id: APP_SETTING_ID, gruppePublishedAt },
    update: { gruppePublishedAt },
    select: { gruppePublishedAt: true },
  });
  return setting.gruppePublishedAt;
}

/**
 * Den ene regelen alle gruppevisningene spør: får denne brukeren se gruppa?
 *
 * `role` er rollen i den aktuelle gruppa — `null` for en admin uten medlemskap.
 */
export function canSeeGruppe({
  isAdmin,
  role,
  published,
}: {
  isAdmin?: boolean | null;
  role: MemberRole | null;
  published: boolean;
}): boolean {
  if (isAdmin === true) return true;
  if (role === "FADDER") return true;
  return published;
}
