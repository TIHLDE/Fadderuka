/**
 * Minimal CSV helpers for admin exports.
 *
 * Semicolon-separated with a UTF-8 BOM: that is what Norwegian Excel expects —
 * a comma-separated file opens as a single column, and without the BOM æøå come
 * out mojibake.
 */

const SEPARATOR = ";";
const BOM = "﻿";

/** A column: the header text plus how to read it off a row. */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/** Quote a field if it could otherwise break the row, and escape inner quotes. */
function escapeField(raw: string | number | null | undefined): string {
  const value = raw == null ? "" : String(raw);
  if (!/["\n\r;]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [
    columns.map((c) => escapeField(c.header)).join(SEPARATOR),
    ...rows.map((row) =>
      columns.map((c) => escapeField(c.value(row))).join(SEPARATOR),
    ),
  ];
  return lines.join("\r\n");
}

/** Trigger a browser download of `csv` as `filename`. Client-side only. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Split a date into `YYYY-MM-DD` and `HH:mm` in Norwegian local time. Separate
 * columns so the export can be sorted and pivoted directly in Excel, which
 * doesn't reliably parse a combined Norwegian datetime string.
 */
export function toDateAndTime(date: Date | string | null | undefined): {
  date: string;
  time: string;
} {
  if (!date) return { date: "", time: "" };
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };

  const parts = new Intl.DateTimeFormat("no-NO", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}
