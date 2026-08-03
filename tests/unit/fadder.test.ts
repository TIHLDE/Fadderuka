import { describe, expect, it } from "vitest";

import {
  cohortYearFromCalendar,
  currentCohortYear,
  deriveIsFadder,
  hasAppAccess,
  isPaymentExempt,
  isSecondYearOrLater,
  parseCohortYear,
} from "~/server/fadder";

describe("parseCohortYear", () => {
  it("leser årstallet Lepton lagrer som studieår", () => {
    expect(parseCohortYear("2026")).toBe(2026);
    expect(parseCohortYear("  2024  ")).toBe(2024);
  });

  it("returnerer null for alt som ikke er et troverdig årstall", () => {
    // Nye studenter har ikke kull ennå, og feltet er fritekst hos oss.
    expect(parseCohortYear(null)).toBeNull();
    expect(parseCohortYear("")).toBeNull();
    expect(parseCohortYear("1. klasse")).toBeNull();
    expect(parseCohortYear("20265")).toBeNull();
    expect(parseCohortYear("1899")).toBeNull();
  });
});

describe("currentCohortYear", () => {
  it("bruker det pinnede årstallet når det er satt", () => {
    expect(currentCohortYear(new Date("2026-03-01"), "2031")).toBe(2031);
  });

  it("ignorerer et ugyldig pinnet årstall og faller tilbake på kalenderen", () => {
    expect(currentCohortYear(new Date("2026-08-15"), "tull")).toBe(2026);
  });
});

describe("cohortYearFromCalendar", () => {
  it("regner nytt kull fra juli, siden fadderuka er i august", () => {
    // I juni går 2025-kullet fortsatt i 1. klasse og skylder penger.
    expect(cohortYearFromCalendar(new Date("2026-06-15"))).toBe(2025);
    expect(cohortYearFromCalendar(new Date("2026-07-01"))).toBe(2026);
    expect(cohortYearFromCalendar(new Date("2026-08-15"))).toBe(2026);
  });
});

describe("isSecondYearOrLater", () => {
  it("er sant for kull eldre enn årets", () => {
    expect(isSecondYearOrLater("2025", 2026)).toBe(true);
    expect(isSecondYearOrLater("2019", 2026)).toBe(true);
  });

  it("er usant for årets kull — de er fadderbarn", () => {
    expect(isSecondYearOrLater("2026", 2026)).toBe(false);
  });

  it("er usant når kullet er ukjent", () => {
    // Nyregistrerte har `class: null` hos TIHLDE, og det er nettopp
    // fadderbarn-tilfellet. Feiler mot "betaler".
    expect(isSecondYearOrLater(null, 2026)).toBe(false);
  });
});

describe("deriveIsFadder", () => {
  it("fritar studenter i 2. klasse eller høyere", () => {
    expect(deriveIsFadder({ klasse: "2025", cohortYear: 2026 })).toBe(true);
  });

  it("lar 1. klasse betale", () => {
    expect(deriveIsFadder({ klasse: "2026", cohortYear: 2026 })).toBe(false);
  });

  it("fritar den som har FADDER-rolle, uansett kull", () => {
    // Dekker fadderen som mangler kulldata på TIHLDE-profilen.
    expect(
      deriveIsFadder({
        klasse: null,
        hasFadderMembership: true,
        cohortYear: 2026,
      }),
    ).toBe(true);
  });

  it("lar en manuell avgjørelse overstyre alt annet", () => {
    // En 2.-klassing som faktisk er fadderbarn skal kunne settes til å betale.
    expect(
      deriveIsFadder({
        fadderOverride: false,
        klasse: "2020",
        hasFadderMembership: true,
        cohortYear: 2026,
      }),
    ).toBe(false);

    expect(
      deriveIsFadder({
        fadderOverride: true,
        klasse: "2026",
        cohortYear: 2026,
      }),
    ).toBe(true);
  });
});

describe("isPaymentExempt / hasAppAccess", () => {
  it("fritar faddere og admins", () => {
    expect(isPaymentExempt({ isFadder: true })).toBe(true);
    expect(isPaymentExempt({ isAdmin: true })).toBe(true);
    expect(isPaymentExempt({ isAdmin: false, isFadder: false })).toBe(false);
  });

  it("gir tilgang til både betalende og fritatte", () => {
    expect(hasAppAccess({ isVerified: true })).toBe(true);
    expect(hasAppAccess({ isFadder: true, isVerified: false })).toBe(true);
    expect(hasAppAccess({ isAdmin: true, isVerified: false })).toBe(true);
    expect(hasAppAccess({ isVerified: false })).toBe(false);
  });
});
