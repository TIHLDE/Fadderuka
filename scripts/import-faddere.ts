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
 *   bun run scripts/import-faddere.ts <fil.xlsx> [--dry]
 *
 * Rows are matched against existing users by email first, then by full name.
 * Only existing users are touched — nothing is created, since a user record
 * here needs a TIHLDE account behind it. Faddere who have not signed into the
 * app yet are reported as "ikke registrert"; re-run the script once they have.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { inflateRawSync } from "node:zlib";

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const COLUMN_ALIASES = {
  name: ["hvaerdittfullenavn", "fulltnavn", "navn", "name", "fullname"],
  email: ["emailaddress", "email", "epost", "e-post", "epostadresse", "mail"],
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
 * A name reduced to something two spellings of the same person share.
 *
 * Diacritics, hyphens and middle names are exactly where the form and the
 * TIHLDE profile disagree ("Alva Kjærstad-Leiner" vs "Alva Kjærstad Leiner"),
 * so fold them all away and compare the name parts as an unordered set.
 */
export function normaliseName(name: string): string {
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

function findColumn(headers: string[], aliases: string[]): number {
  const exact = headers.findIndex((h) => aliases.includes(h));
  if (exact !== -1) return exact;
  // Google Forms headers are whole questions, so fall back to a substring hit.
  return headers.findIndex((h) => aliases.some((a) => h.includes(a)));
}

interface ListedFadder {
  name: string;
  email: string;
}

/** Column letters in spreadsheet order, so header index maps back to a cell. */
function columnLetters(rows: Record<string, string>[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row)) seen.add(key);
  return [...seen].sort((a, b) =>
    a.length === b.length ? a.localeCompare(b) : a.length - b.length,
  );
}

function readFadderList(file: string): ListedFadder[] {
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

  return rows
    .slice(1)
    .map((row) => ({
      name: (nameLetter ? (row[nameLetter] ?? "") : "").trim(),
      email: (emailLetter ? (row[emailLetter] ?? "") : "").trim().toLowerCase(),
    }))
    .filter((r) => r.name !== "" || r.email !== "");
}

// ---------------------------------------------------------------------------

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  const dryRun = flags.includes("--dry");

  if (!file) {
    console.error("Bruk: bun run scripts/import-faddere.ts <fil.xlsx> [--dry]");
    process.exit(1);
  }

  const listed = readFadderList(file);
  console.log(`Leste ${listed.length} rader fra ${file}.\n`);

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      klasse: true,
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
    const key = normaliseName(user.name);
    byName.set(key, [...(byName.get(key) ?? []), user]);
  }

  const toUpdate = new Map<string, (typeof users)[number]>();
  const alreadySet: string[] = [];
  const unregistered: string[] = [];
  const ambiguous: string[] = [];
  const needsRefund: string[] = [];

  for (const row of listed) {
    const label = `${row.name || "(uten navn)"} <${row.email || "uten e-post"}>`;

    let user = row.email ? byEmail.get(row.email) : undefined;
    if (!user && row.name) {
      const candidates = byName.get(normaliseName(row.name)) ?? [];
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
  if (ambiguous.length > 0) {
    console.log(`\nTvetydige – sett manuelt i adminpanelet:\n  ${ambiguous.join("\n  ")}`);
  }
  if (unregistered.length > 0) {
    console.log(
      `\nIkke registrert i appen ennå (${unregistered.length}) – kjør skriptet på nytt når de har logget inn:\n  ` +
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
