import { describe, expect, it } from "vitest";

import { toCsv, toDateAndTime } from "~/lib/csv";

describe("toCsv", () => {
  it("skriver header og rader semikolonseparert", () => {
    const csv = toCsv([{ navn: "Ola", antall: 2 }], [
      { header: "Navn", value: (r) => r.navn },
      { header: "Antall", value: (r) => r.antall },
    ]);
    expect(csv).toBe("Navn;Antall\r\nOla;2");
  });

  it("quoter felt som inneholder separator, linjeskift eller anførselstegn", () => {
    const csv = toCsv(
      [{ v: 'Ola; "Kari"' }, { v: "linje1\nlinje2" }],
      [{ header: "V", value: (r) => r.v }],
    );
    const [, first, second] = csv.split("\r\n");
    expect(first).toBe('"Ola; ""Kari"""');
    expect(second).toBe('"linje1\nlinje2"');
  });

  it("skriver tom streng for null og undefined", () => {
    const csv = toCsv(
      [{ a: null, b: undefined }],
      [
        { header: "A", value: (r) => r.a },
        { header: "B", value: (r) => r.b },
      ],
    );
    expect(csv).toBe("A;B\r\n;");
  });

  it("gir bare header når det ikke finnes rader", () => {
    expect(toCsv([], [{ header: "A", value: () => "" }])).toBe("A");
  });
});

describe("toDateAndTime", () => {
  it("formaterer i norsk tid (sommertid, UTC+2)", () => {
    expect(toDateAndTime(new Date("2026-07-19T10:30:00Z"))).toEqual({
      date: "2026-07-19",
      time: "12:30",
    });
  });

  it("formaterer i norsk tid (vintertid, UTC+1)", () => {
    expect(toDateAndTime(new Date("2026-01-15T23:30:00Z"))).toEqual({
      date: "2026-01-16",
      time: "00:30",
    });
  });

  it("godtar ISO-strenger", () => {
    expect(toDateAndTime("2026-07-19T10:30:00Z").time).toBe("12:30");
  });

  it("gir tomme felt for null og ugyldig dato", () => {
    expect(toDateAndTime(null)).toEqual({ date: "", time: "" });
    expect(toDateAndTime("ikke en dato")).toEqual({ date: "", time: "" });
  });
});
