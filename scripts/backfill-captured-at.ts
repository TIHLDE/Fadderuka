/**
 * One-off backfill of `Payment.capturedAt` from a Vipps portal export.
 *
 * The migration seeds `capturedAt` from `updatedAt`, which is accurate for every
 * payment that went through this app. This script is for correcting those rows
 * against the exact timestamps Vipps reports — export the transaction list from
 * the Vipps merchant portal and feed it in.
 *
 * Usage:
 *   bun run scripts/backfill-captured-at.ts <fil.csv> [--dry]
 *
 * The CSV needs a header row containing a reference column and a timestamp
 * column; common Vipps/Excel header spellings are recognised (see COLUMN_ALIASES).
 * Separator is auto-detected (";" or ","). Rows whose reference is unknown are
 * reported and skipped — nothing is created, only existing orders are updated.
 */

import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const COLUMN_ALIASES = {
  reference: ["reference", "referanse", "orderid", "ordre-id", "ordreid"],
  timestamp: [
    "timestamp",
    "tidspunkt",
    "dato",
    "date",
    "capturedat",
    "captured",
    "betalt",
  ],
};

/** Strip quotes/BOM and normalise a header cell for alias matching. */
function normaliseHeader(cell: string): string {
  return cell
    .replace(/^﻿/, "")
    .replace(/^"|"$/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]/g, "");
}

function splitLine(line: string, separator: string): string[] {
  // Vipps exports quote fields containing the separator; handle that minimally.
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

function findColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) => aliases.includes(h));
}

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  const dryRun = flags.includes("--dry");

  if (!file) {
    console.error(
      "Bruk: bun run scripts/backfill-captured-at.ts <fil.csv> [--dry]",
    );
    process.exit(1);
  }

  const raw = readFileSync(file, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headerLine = lines[0];

  if (!headerLine) {
    console.error("Tom fil.");
    process.exit(1);
  }

  const separator = headerLine.includes(";") ? ";" : ",";
  const headers = splitLine(headerLine, separator).map(normaliseHeader);

  const refIndex = findColumn(headers, COLUMN_ALIASES.reference);
  const timeIndex = findColumn(headers, COLUMN_ALIASES.timestamp);

  if (refIndex === -1 || timeIndex === -1) {
    console.error(
      `Fant ikke nødvendige kolonner. Header var: ${headers.join(", ")}`,
    );
    console.error(
      `Trenger én av [${COLUMN_ALIASES.reference.join(", ")}] og én av [${COLUMN_ALIASES.timestamp.join(", ")}]`,
    );
    process.exit(1);
  }

  let updated = 0;
  let unchanged = 0;
  const missing: string[] = [];
  const badDates: string[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitLine(line, separator);
    const orderId = cells[refIndex]?.replace(/^"|"$/g, "").trim();
    const rawDate = cells[timeIndex]?.replace(/^"|"$/g, "").trim();

    if (!orderId || !rawDate) continue;

    const capturedAt = new Date(rawDate);
    if (Number.isNaN(capturedAt.getTime())) {
      badDates.push(`${orderId}: "${rawDate}"`);
      continue;
    }

    const existing = await db.payment.findUnique({
      where: { orderId },
      select: { capturedAt: true },
    });

    if (!existing) {
      missing.push(orderId);
      continue;
    }

    if (existing.capturedAt?.getTime() === capturedAt.getTime()) {
      unchanged += 1;
      continue;
    }

    if (!dryRun) {
      await db.payment.update({ where: { orderId }, data: { capturedAt } });
    }
    updated += 1;
    console.log(
      `${dryRun ? "[dry] " : ""}${orderId} -> ${capturedAt.toISOString()}`,
    );
  }

  console.log(
    `\nFerdig. Oppdatert: ${updated}, allerede riktig: ${unchanged}, ukjent referanse: ${missing.length}, ugyldig dato: ${badDates.length}`,
  );
  if (missing.length > 0) {
    console.log("Ukjente referanser:", missing.join(", "));
  }
  if (badDates.length > 0) {
    console.log("Ugyldige datoer:", badDates.join(", "));
  }
  if (dryRun) console.log("(Tørrkjøring – ingenting ble skrevet)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
