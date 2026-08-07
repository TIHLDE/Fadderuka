/**
 * One-off repair after the OAuth cutover destroyed the stored passwords.
 *
 * `20260806211849_photon_oauth_cutover` dropped `User.passwordHash` from
 * production. That was the only credential the students who signed up through
 * Fadderuka's own form had — 130 of them, 113 of whom had already paid — and
 * they have no usable TIHLDE account to fall back on, because theirs were
 * created in Lepton after the Photon migration. They are locked out of the app
 * they paid for.
 *
 * The hashes are not recoverable: Neon runs a six-hour history window on the
 * free plan, and the migration ran roughly eight hours before the earliest
 * restorable point. There are no snapshots.
 *
 * So this restores the one fact that can be restored — that these accounts have
 * a local password — by writing the `RESET_REQUIRED` sentinel. That is not a
 * valid hash, so nobody can sign in with it; but it is non-null, which is what
 * `glemt-passord` requires before it will send a reset link. The student sets a
 * new password themselves from there.
 *
 * Usage:
 *   bun run scripts/marker-passord-for-reset.ts [--apply]
 *
 * Prints who it would touch and changes nothing unless `--apply` is passed.
 * READ THE DRY RUN FIRST: the selection is a heuristic (see below), and a
 * mismatch would hand a TIHLDE-authenticated account a local password it should
 * never have.
 *
 * Idempotent. Rows that already hold a real hash are never touched.
 */

import { PrismaClient } from "@prisma/client";

import { RESET_REQUIRED } from "../src/server/auth/password";

const db = new PrismaClient();

/**
 * Who counts as self-registered.
 *
 * There is no column recording it — the accounts predate the flag we would want
 * — so this reconstructs it from what a self-registration leaves behind:
 *
 *   - a private address, because the old form asked for any e-mail and TIHLDE
 *     members arrive with whatever their profile carries;
 *   - no `klasse`, because the cohort is only ever written by a TIHLDE profile
 *     read, which these accounts have never had;
 *   - not an admin, who all came in through TIHLDE;
 *   - `passwordHash` null, which after the drop is everyone, but keeps the
 *     script idempotent once it has run.
 */
const SELF_REGISTERED = {
  klasse: null,
  isAdmin: false,
  passwordHash: null,
  NOT: { email: { endsWith: "@stud.ntnu.no", mode: "insensitive" as const } },
};

async function main() {
  const apply = process.argv.includes("--apply");

  const users = await db.user.findMany({
    where: SELF_REGISTERED,
    select: {
      id: true,
      tihldeUserId: true,
      name: true,
      email: true,
      hasPaid: true,
      isVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0) {
    console.log("Ingen kontoer å markere. Ingenting å gjøre.");
    return;
  }

  console.log(
    `${apply ? "Markerer" : "[tørrkjøring] Ville markert"} ${users.length} kontoer for passordbytte:\n`,
  );
  for (const user of users) {
    console.log(
      `  ${user.tihldeUserId.padEnd(16)} ${user.name} <${user.email ?? "uten e-post"}>` +
        `  registrert=${user.createdAt.toISOString().slice(0, 10)}` +
        `  ${user.hasPaid ? "BETALT" : "ikke betalt"}`,
    );
  }

  const betalt = users.filter((u) => u.hasPaid).length;
  console.log(`\nAv disse har ${betalt} betalt.`);

  if (!apply) {
    console.log(
      "\n(Tørrkjøring – ingenting ble skrevet.)\n" +
        "Les lista over. Kjenner du igjen noen som logger inn med TIHLDE, skal de\n" +
        "IKKE stå her — da må utvalget strammes inn før du kjører med --apply.",
    );
    return;
  }

  const result = await db.user.updateMany({
    where: SELF_REGISTERED,
    data: { passwordHash: RESET_REQUIRED },
  });

  console.log(`\nFerdig. ${result.count} kontoer kan nå bruke «Glemt passord».`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
