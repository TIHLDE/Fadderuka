import { describe, expect, it } from "vitest";

import {
  genderBreakdown,
  genderLabel,
  matchesGenderFilter,
} from "~/lib/gender";

describe("gender", () => {
  it("gir norsk tekst, og «Ikke oppgitt» for tomt svar", () => {
    expect(genderLabel("KVINNE")).toBe("Kvinne");
    expect(genderLabel(null)).toBe("Ikke oppgitt");
  });

  it("filtrerer på kjønn, ikke oppgitt og alle", () => {
    expect(matchesGenderFilter("MANN", "ALLE")).toBe(true);
    expect(matchesGenderFilter(null, "ALLE")).toBe(true);
    expect(matchesGenderFilter("MANN", "MANN")).toBe(true);
    expect(matchesGenderFilter("KVINNE", "MANN")).toBe(false);
    expect(matchesGenderFilter(null, "IKKE_OPPGITT")).toBe(true);
    expect(matchesGenderFilter("ANNET", "IKKE_OPPGITT")).toBe(false);
  });

  it("summerer fordelingen i en gruppe og hopper over nuller", () => {
    expect(
      genderBreakdown(["MANN", "KVINNE", "MANN", null, "KVINNE", "MANN"]),
    ).toBe("3 mann · 2 kvinne · 1 ikke oppgitt");
    expect(genderBreakdown([])).toBe("Ingen medlemmer");
  });
});
