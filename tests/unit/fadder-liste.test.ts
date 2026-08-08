import { describe, expect, it } from "vitest";

import {
  admissionYearFromFormClass,
  normaliseFadderName,
} from "~/lib/fadder-liste";
import { studyLabelForFormCode } from "~/lib/majors";
import {
  type FadderListEntryLike,
  matchFadderList,
} from "~/server/fadder-liste";

const entry = (over: Partial<FadderListEntryLike> = {}): FadderListEntryLike => ({
  id: "e1",
  name: "Alva Kjærstad Leiner",
  normalisedName: normaliseFadderName("Alva Kjærstad Leiner"),
  studieretning: "Dataingeniør",
  kull: 2025,
  email: "alvakleiner@gmail.com",
  ...over,
});

describe("studyLabelForFormCode", () => {
  it("resolves every abbreviation the sign-up form uses", () => {
    expect(studyLabelForFormCode("Data")).toBe("Dataingeniør");
    expect(studyLabelForFormCode("Digfor")).toBe("Digital Forretningsutvikling");
    expect(studyLabelForFormCode("Digsec")).toBe(
      "Digital Infrastruktur og Cybersikkerhet",
    );
    expect(studyLabelForFormCode("digtrans")).toBe("Digital transformasjon");
  });

  it("still resolves a sheet that spells the programme out", () => {
    expect(studyLabelForFormCode("dataingeniør")).toBe("Dataingeniør");
  });

  it("returns null rather than guessing at an unknown code", () => {
    expect(studyLabelForFormCode("Bygg")).toBeNull();
    expect(studyLabelForFormCode("")).toBeNull();
  });
});

describe("admissionYearFromFormClass", () => {
  it("reads the spreadsheet floats the form exports", () => {
    expect(admissionYearFromFormClass("1.0", 2026)).toBe(2025);
    expect(admissionYearFromFormClass("4.0", 2026)).toBe(2022);
  });

  it("rejects values that cannot be a class year", () => {
    expect(admissionYearFromFormClass("0", 2026)).toBeNull();
    expect(admissionYearFromFormClass("9", 2026)).toBeNull();
    expect(admissionYearFromFormClass("tja", 2026)).toBeNull();
    expect(admissionYearFromFormClass("", 2026)).toBeNull();
  });
});

describe("matchFadderList", () => {
  it("matches on name across hyphen and middle-name spellings", () => {
    const verdict = matchFadderList([entry({ email: null })], {
      name: "Alva Kjærstad-Leiner",
      email: "alva@stud.ntnu.no",
      studieretning: "Dataingeniør",
      klasse: "2025",
    });
    expect(verdict.matched).toBe(true);
    if (verdict.matched) expect(verdict.via).toBe("name");
  });

  it("prefers an exact email hit", () => {
    const verdict = matchFadderList([entry()], {
      name: "Helt Annet Navn",
      email: "AlvaKLeiner@gmail.com",
      studieretning: "Dataingeniør",
      klasse: "2025",
    });
    expect(verdict.matched).toBe(true);
    if (verdict.matched) expect(verdict.via).toBe("email");
  });

  it("refuses a name hit whose programme contradicts the list", () => {
    const verdict = matchFadderList([entry({ email: null })], {
      name: "Alva Kjærstad Leiner",
      email: null,
      studieretning: "Digital transformasjon",
      klasse: "2025",
    });
    expect(verdict.matched).toBe(false);
    expect("rejected" in verdict && verdict.rejected.reason).toBe(
      "studieretning",
    );
  });

  it("still matches when the profile has no programme to compare", () => {
    const verdict = matchFadderList([entry({ email: null })], {
      name: "Alva Kjærstad Leiner",
      email: null,
      studieretning: null,
      klasse: "2025",
    });
    expect(verdict.matched).toBe(true);
    if (verdict.matched) expect(verdict.studieretningMatches).toBeNull();
  });

  it("matches a Digtrans fadder whose cohort disagrees, and says so", () => {
    // She answered "4. klasse" because she came from another bachelor, but
    // started Digtrans in 2025 — so the sheet says 2022 and TIHLDE says 2025.
    // The cohort is advisory precisely so this person is not turned away.
    const verdict = matchFadderList(
      [
        entry({
          email: null,
          studieretning: "Digital transformasjon",
          kull: 2022,
        }),
      ],
      {
        name: "Alva Kjærstad Leiner",
        email: null,
        studieretning: "Digital transformasjon",
        klasse: "2025",
      },
    );
    expect(verdict.matched).toBe(true);
    if (verdict.matched) expect(verdict.kullMatches).toBe(false);
  });

  it("does not match someone who is not on the list", () => {
    const verdict = matchFadderList([entry()], {
      name: "Ukjent Person",
      email: "ukjent@stud.ntnu.no",
      studieretning: "Dataingeniør",
      klasse: "2025",
    });
    expect(verdict.matched).toBe(false);
  });
});
