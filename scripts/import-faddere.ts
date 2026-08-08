/**
 * Mark everyone on the fadder sign-up list as a fadder.
 *
 * FadderKom collects fadder applications in a Google Form and exports the
 * responses as an .xlsx. Those people never owe money for fadderuka, but the
 * app only learns that on its own once their TIHLDE profile shows a study
 * cohort from before this year's — which is wrong for anyone whose profile is
 * missing a cohort, and stale for anyone who last logged in before the cohort
 * year was rolled over. This script closes that gap in bulk instead of one
 * admin click at a time.
 *
 * It sets exactly what the admin panel's "marker som fadder" button sets
 * (`isFadder`, the pinned `fadderOverride`, and `isVerified`), so a decision
 * made here survives every later login the same way.
 *
 * Usage:
 *   bun run scripts/import-faddere.ts <fil.xlsx> [--dry] [--paameldingsar=ÅÅÅÅ]
 *
 * Two things happen, in this order:
 *
 * 1. The whole sheet is stored in `FadderListEntry`. Most of it has no user
 *    row yet — the form is filled in during spring, and someone who has never
 *    signed in cannot be flagged — so the list is kept, and the auth callback
 *    reads it on every first login. That is what makes this run once instead
 *    of having to be repeated as people trickle in.
 * 2. Users who *do* already exist are flagged immediately, matched by email
 *    first and then by full name, so nobody has to log out and back in.
 *
 * No user is ever created here: a user row needs a TIHLDE account behind it.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { inflateRawSync } from "node:zlib";

import { PrismaClient } from "@prisma/client";

import {
  admissionYearFromFormClass,
  normaliseFadderName,
} from "../src/lib/fadder-liste";
import { findMajor, studyLabelForFormCode } from "../src/lib/majors";

const db = new PrismaClient();

const COLUMN_ALIASES = {
  name: ["hvaerdittfullenavn", "fulltnavn", "navn", "name", "fullname"],
  email: ["emailaddress", "email", "epost", "e-post", "epostadresse", "mail"],
  // "Hvilken linje går du?" — answered with FadderKom's own abbreviations
  // (Data, Digfor, Digsec, Digtrans), which `studyLabelForFormCode` resolves.
  studieretning: ["hvilkenlinjegardu", "linje", "studieretning", "studie"],
  // "Hvilken klasse går du?" — an ordinal at sign-up time, not an admission
  // year; `admissionYearFromFormClass` converts it.
  klasse: ["hvilkenklassegardu", "klasse", "kull", "arstrinn"],
};

// ---------------------------------------------------------------------------
// Minimal .xlsx reader
//
// An .xlsx is a ZIP of XML parts. Reading the two parts we need directly keeps
// this script dependency-free — a spreadsheet library would be the only reason
// the app depends on one at all.
// ---------------------------------------------------------------------------

/** Read one file out of a ZIP archive, or null when it isn't there. */
function readZipEntry(zip: Buffer, name: string): string | null {
  // Locate the end-of-central-directory record by scanning back from the tail;
  // it is last in the file and at most 22 bytes plus a comment.
  const EOCD_SIGNATURE = 0x06054b50;
  let eocd = -1;
  for (let i = zip.length - 22; i >= 0; i--) {
    if (zip.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("Ugyldig .xlsx: fant ikke ZIP-katalogen.");

  const entryCount = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);

  for (let i = 0; i < entryCount; i++) {
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const entryName = zip
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8");

    if (entryName === name) {
      const method = zip.readUInt16LE(offset + 10);
      const compressedSize = zip.readUInt32LE(offset + 20);
      const localHeader = zip.readUInt32LE(offset + 42);
      // The local header repeats the name/extra lengths, and its extra field
      // can differ in length from the central directory's — read it here.
      const localNameLength = zip.readUInt16LE(localHeader + 26);
      const localExtraLength = zip.readUInt16LE(localHeader + 28);
      const start = localHeader + 30 + localNameLength + localExtraLength;
      const data = zip.subarray(start, start + compressedSize);
      return (method === 0 ? data : inflateRawSync(data)).toString("utf8");
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

export function decodeXml(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (whole, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(parseInt(entity.slice(1), 10));
    }
    return XML_ENTITIES[entity] ?? whole;
  });
}

/** Concatenate every `<t>` run inside a chunk of shared/inline string XML. */
function textRuns(xml: string): string {
  const runs = xml.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? [];
  return runs
    .map((run) => decodeXml(run.replace(/^<t[^>]*>/, "").replace(/<\/t>$/, "")))
    .join("");
}

/** The rows of the workbook's first sheet, as arrays of column-letter → text. */
function readSheetRows(file: string): Record<string, string>[] {
  const zip = readFileSync(file);

  const workbook = readZipEntry(zip, "xl/workbook.xml");
  if (!workbook) throw new Error("Ugyldig .xlsx: mangler xl/workbook.xml.");

  // The first <sheet> is the one shown first in Excel; resolve its r:id
  // through the workbook relationships to the actual worksheet part.
  const relId = /<sheet[^>]*r:id="([^"]+)"/.exec(workbook)?.[1];
  const rels = readZipEntry(zip, "xl/_rels/workbook.xml.rels") ?? "";
  const target = relId
    ? new RegExp(`<Relationship[^>]*Id="${relId}"[^>]*Target="([^"]+)"`).exec(
        rels,
      )?.[1]
    : undefined;
  const sheetPath = target
    ? `xl/${target.replace(/^\/?xl\//, "")}`
    : "xl/worksheets/sheet1.xml";

  const sheet = readZipEntry(zip, sheetPath);
  if (!sheet) throw new Error(`Ugyldig .xlsx: mangler ${sheetPath}.`);

  const sharedXml = readZipEntry(zip, "xl/sharedStrings.xml") ?? "";
  const shared = (sharedXml.match(/<si>[\s\S]*?<\/si>/g) ?? []).map(textRuns);

  const rows: Record<string, string>[] = [];
  for (const rowXml of sheet.match(/<row[\s\S]*?<\/row>/g) ?? []) {
    const cells: Record<string, string> = {};
    for (const cellXml of rowXml.match(/<c [\s\S]*?(?:\/>|<\/c>)/g) ?? []) {
      const ref = /r="([A-Z]+)\d+"/.exec(cellXml)?.[1];
      if (!ref) continue;
      const type = /t="([^"]+)"/.exec(cellXml)?.[1];
      const raw = /<v>([\s\S]*?)<\/v>/.exec(cellXml)?.[1];

      let value: string;
      if (type === "s" && raw !== undefined) {
        value = shared[Number(raw)] ?? "";
      } else if (type === "inlineStr") {
        value = textRuns(cellXml);
      } else {
        value = raw === undefined ? "" : decodeXml(raw);
      }
      if (value !== "") cells[ref] = value;
    }
    rows.push(cells);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/** Strip quotes/BOM and normalise a header cell for alias matching. */
export function normaliseHeader(cell: string): string {
  return cell
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_?.,]/g, "");
}

/**
 * Re-exported so the login path and this importer fold names identically —
 * a name that matches here but not there would be a fadder who is on the list
 * and still gets a payment demand.
 */
export { normaliseFadderName as normaliseName };

function findColumn(headers: string[], aliases: string[]): number {
  const exact = headers.findIndex((h) => aliases.includes(h));
  if (exact !== -1) return exact;
  // Google Forms headers are whole questions, so fall back to a substring hit.
  return headers.findIndex((h) => aliases.some((a) => h.includes(a)));
}

interface ListedFadder {
  name: string;
  email: string;
  /** Resolved MAJORS label, or null when the sheet used a code we don't know. */
  studieretning: string | null;
  /** Admission year derived from the sign-up-time class ordinal. */
  kull: number | null;
}

/** Column letters in spreadsheet order, so header index maps back to a cell. */
function columnLetters(rows: Record<string, string>[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row)) seen.add(key);
  return [...seen].sort((a, b) =>
    a.length === b.length ? a.localeCompare(b) : a.length - b.length,
  );
}

function readFadderList(file: string, signupYear: number): ListedFadder[] {
  const rows = readSheetRows(file);
  const headerRow = rows[0];
  if (!headerRow) throw new Error("Tomt regneark.");

  const letters = columnLetters(rows);
  const headers = letters.map((l) => normaliseHeader(headerRow[l] ?? ""));

  const nameIndex = findColumn(headers, COLUMN_ALIASES.name);
  const emailIndex = findColumn(headers, COLUMN_ALIASES.email);

  if (nameIndex === -1 && emailIndex === -1) {
    throw new Error(
      `Fant verken navne- eller e-postkolonne. Kolonneoverskrifter: ${headers.join(" | ")}`,
    );
  }

  const nameLetter = letters[nameIndex];
  const emailLetter = letters[emailIndex];
  const studieretningLetter = letters[findColumn(headers, COLUMN_ALIASES.studieretning)];
  const klasseLetter = letters[findColumn(headers, COLUMN_ALIASES.klasse)];

  const cell = (row: Record<string, string>, letter: string | undefined) =>
    (letter ? (row[letter] ?? "") : "").trim();

  return rows
    .slice(1)
    .map((row) => ({
      name: cell(row, nameLetter),
      email: cell(row, emailLetter).toLowerCase(),
      studieretning: studyLabelForFormCode(cell(row, studieretningLetter)),
      kull: admissionYearFromFormClass(cell(row, klasseLetter), signupYear),
    }))
    .filter((r) => r.name !== "" || r.email !== "");
}

// ---------------------------------------------------------------------------

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  const dryRun = flags.includes("--dry");

  if (!file) {
    console.error(
      "Bruk: bun run scripts/import-faddere.ts <fil.xlsx> [--dry] [--paameldingsar=ÅÅÅÅ]",
    );
    process.exit(1);
  }

  /**
   * The year the form was filled in, which is what turns its class ordinal
   * into an admission year. Defaults to now because the list is imported in
   * the same year it is collected; overridable for re-running an old sheet.
   */
  const signupYear = Number(
    flags.find((f) => f.startsWith("--paameldingsar="))?.split("=")[1] ??
      new Date().getFullYear(),
  );

  const listed = readFadderList(file, signupYear);
  console.log(
    `Leste ${listed.length} rader fra ${file} (påmeldingsår ${signupYear}).\n`,
  );

  /**
   * Store the list first, and unconditionally.
   *
   * Most of the sheet has no user row yet — the form is filled in during
   * spring, and a fadder who has not signed in cannot be flagged. Persisting
   * the list is what lets her first login recognise her instead of FadderKom
   * having to re-run this script at exactly the right moment.
   */
  const unnamed = listed.filter((r) => r.name === "").length;
  const named = listed.filter((r) => r.name !== "");
  let stored = 0;
  for (const row of named) {
    if (!dryRun) {
      await db.fadderListEntry.upsert({
        where: { normalisedName: normaliseFadderName(row.name) },
        create: {
          name: row.name,
          normalisedName: normaliseFadderName(row.name),
          studieretning: row.studieretning,
          kull: row.kull,
          email: row.email || null,
        },
        update: {
          name: row.name,
          studieretning: row.studieretning,
          kull: row.kull,
          email: row.email || null,
        },
        select: { id: true },
      });
    }
    stored++;
  }
  console.log(
    `${dryRun ? "[tørrkjøring] " : ""}Lagret ${stored} rader i fadderlista` +
      (unnamed > 0 ? ` (${unnamed} rader uten navn hoppet over)` : "") +
      ".\n",
  );

  const uresolvedStudy = named.filter((r) => r.studieretning === null);
  if (uresolvedStudy.length > 0) {
    console.log(
      `Uten gjenkjent linje (${uresolvedStudy.length}) – disse matcher på navn alene:\n  ` +
        uresolvedStudy.map((r) => r.name).join("\n  ") +
        "\n",
    );
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      klasse: true,
      studieretning: true,
      isFadder: true,
      fadderOverride: true,
      hasPaid: true,
    },
  });

  const byEmail = new Map(
    users.flatMap((u) => (u.email ? [[u.email.toLowerCase(), u] as const] : [])),
  );
  const byName = new Map<string, typeof users>();
  for (const user of users) {
    const key = normaliseFadderName(user.name);
    byName.set(key, [...(byName.get(key) ?? []), user]);
  }

  const toUpdate = new Map<string, (typeof users)[number]>();
  const alreadySet: string[] = [];
  const unregistered: string[] = [];
  const ambiguous: string[] = [];
  const mismatched: string[] = [];
  const needsRefund: string[] = [];

  for (const row of listed) {
    const label = `${row.name || "(uten navn)"} <${row.email || "uten e-post"}>`;

    let user = row.email ? byEmail.get(row.email) : undefined;
    if (!user && row.name) {
      const candidates = byName.get(normaliseFadderName(row.name)) ?? [];
      if (candidates.length > 1) {
        ambiguous.push(`${label} — ${candidates.length} brukere med samme navn`);
        continue;
      }
      user = candidates[0];
    }

    if (!user) {
      unregistered.push(label);
      continue;
    }

    /**
     * The same veto the login path applies, and for the same reason: a name is
     * not an identity. Two students called Sivert Eikrem exist — one a Digsec
     * fadder on this list, one a paying Digital transformasjon student who is
     * not — and matching on the name alone exempted the wrong one, wiping out
     * a payment that had actually been made. A programme that contradicts the
     * list means this is a different person, so leave them alone and say so.
     */
    const listMajor = findMajor(row.studieretning);
    const userMajor = findMajor(user.studieretning);
    if (listMajor && userMajor && listMajor !== userMajor) {
      mismatched.push(
        `${label} — lista sier ${row.studieretning}, brukeren går ${user.studieretning}`,
      );
      continue;
    }

    if (user.isFadder && user.fadderOverride === true) {
      alreadySet.push(label);
      continue;
    }

    toUpdate.set(user.id, user);
    // A fadder who already paid is owed the money back; the admin panel's
    // payment overview is where that refund is issued.
    if (user.hasPaid) needsRefund.push(`${user.name} <${user.email ?? ""}>`);
  }

  for (const user of toUpdate.values()) {
    console.log(
      `${dryRun ? "[tørrkjøring] " : ""}${user.name} <${user.email ?? "-"}> ` +
        `klasse=${user.klasse ?? "ukjent"} isFadder=${user.isFadder} -> fadder`,
    );
    if (!dryRun) {
      await db.user.update({
        where: { id: user.id },
        data: { isFadder: true, fadderOverride: true, isVerified: true },
        // Narrow the RETURNING clause deliberately: the default reads every
        // scalar column, which fails outright against a database that has not
        // caught up with the newest migration. This script only ever needs to
        // know the write happened.
        select: { id: true },
      });
    }
  }

  console.log(
    `\nFerdig. Satt som fadder: ${toUpdate.size}, allerede fadder: ${alreadySet.length}, ` +
      `ikke registrert i appen: ${unregistered.length}, tvetydige navn: ${ambiguous.length}`,
  );

  if (needsRefund.length > 0) {
    console.log(
      `\nHar betalt og må refunderes (${needsRefund.length}):\n  ${needsRefund.join("\n  ")}`,
    );
  }
  if (mismatched.length > 0) {
    console.log(
      `\nHoppet over – navnet traff, men linja stemmer ikke (${mismatched.length}).\n` +
        `Sannsynligvis en annen person med samme navn:\n  ` +
        mismatched.join("\n  "),
    );
  }
  if (ambiguous.length > 0) {
    console.log(`\nTvetydige – sett manuelt i adminpanelet:\n  ${ambiguous.join("\n  ")}`);
  }
  if (unregistered.length > 0) {
    console.log(
      `\nIkke registrert i appen ennå (${unregistered.length}) – de står i fadderlista ` +
        `og blir satt som fadder automatisk første gang de logger inn:\n  ` +
        unregistered.join("\n  "),
    );
  }
  if (dryRun) console.log("\n(Tørrkjøring – ingenting ble skrevet)");
}

// Only run when invoked as a command. The matching helpers above are unit
// tested, and importing this file must not start talking to the database.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => void db.$disconnect());
}
