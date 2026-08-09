import { describe, expect, it } from "vitest";

import {
  type FadderListEntryLike,
  admissionYearFromFormClass,
  matchFadderList,
  nameIsSubset,
  normaliseFadderName,
} from "~/lib/fadder-liste";
import { studyLabelForFormCode } from "~/lib/majors";

/** The real row from the spring 2026 sheet, which is where the hard case is. */
const sivertRow = (): FadderListEntryLike => ({
  id: "e1",
  name: "Sivert Eikrem",
  normalisedName: normaliseFadderName("Sivert Eikrem"),
  studieretning: "Digital Infrastruktur og Cybersikkerhet",
  kull: 2025,
  email: "trevis.eikrem@gmail.com",
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

  it("returns null rather than guessing at an unknown code", () => {
    expect(studyLabelForFormCode("Bygg")).toBeNull();
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
  });
});

describe("nameIsSubset", () => {
  it("lets the profile carry middle names the form left out", () => {
    expect(nameIsSubset("Sivert Eikrem", "Sivert Nygård Eikrem")).toBe(true);
    expect(nameIsSubset("Leona Spark", "Leona Annika Hammond Spark")).toBe(true);
  });

  it("ignores hyphens, diacritics and word order", () => {
    expect(nameIsSubset("Alva Kjærstad-Leiner", "Leiner Alva Kjaerstad")).toBe(
      true,
    );
  });

  it("does not match when the form has a part the profile lacks", () => {
    expect(nameIsSubset("Sivert Nygård Eikrem", "Sivert Eikrem")).toBe(false);
    expect(nameIsSubset("Ukjent Person", "Sivert Eikrem")).toBe(false);
  });
});

describe("matchFadderList", () => {
  it("picks the right person out of two namesakes", () => {
    // The real case: both students match the name, and only the programme and
    // cohort separate the Digsec fadder from the paying Digtrans student.
    const fadder = matchFadderList([sivertRow()], {
      name: "Sivert Nygård Eikrem",
      email: "siverne@stud.ntnu.no",
      studieretning: "Digital infrastruktur og cybersikkerhet",
      klasse: "2025",
    });
    expect(fadder.matched).toBe(true);

    const namesake = matchFadderList([sivertRow()], {
      name: "Sivert Eikrem",
      email: "sivertstokneseikrem@gmail.com",
      studieretning: "Digital transformasjon",
      klasse: "2023",
    });
    expect(namesake.matched).toBe(false);
    if (!namesake.matched) expect(namesake.reason).toBe("linje");
  });

  it("refuses when only the cohort disagrees", () => {
    const v = matchFadderList([sivertRow()], {
      name: "Sivert Eikrem",
      email: null,
      studieretning: "Digital Infrastruktur og Cybersikkerhet",
      klasse: "2023",
    });
    expect(v.matched).toBe(false);
    if (!v.matched) expect(v.reason).toBe("kull");
  });

  it("refuses an incomplete profile instead of matching on the name alone", () => {
    const utenLinje = matchFadderList([sivertRow()], {
      name: "Sivert Eikrem",
      email: null,
      studieretning: null,
      klasse: "2025",
    });
    expect(utenLinje.matched).toBe(false);
    if (!utenLinje.matched) expect(utenLinje.reason).toBe("ufullstendig-profil");

    const utenKull = matchFadderList([sivertRow()], {
      name: "Sivert Eikrem",
      email: null,
      studieretning: "Digital Infrastruktur og Cybersikkerhet",
      klasse: null,
    });
    expect(utenKull.matched).toBe(false);
    if (!utenKull.matched) expect(utenKull.reason).toBe("ufullstendig-profil");
  });

  it("does not let an e-mail hit skip the programme and cohort checks", () => {
    const v = matchFadderList([sivertRow()], {
      name: "Helt Annet Navn",
      email: "TREVIS.eikrem@gmail.com",
      studieretning: "Digital transformasjon",
      klasse: "2022",
    });
    expect(v.matched).toBe(false);
  });

  it("refuses rather than picks when two rows agree on all three", () => {
    const a = sivertRow();
    const b = { ...sivertRow(), id: "e2" };
    const v = matchFadderList([a, b], {
      name: "Sivert Eikrem",
      email: null,
      studieretning: "Digital Infrastruktur og Cybersikkerhet",
      klasse: "2025",
    });
    expect(v.matched).toBe(false);
    if (!v.matched) expect(v.reason).toBe("tvetydig");
  });

  it("does not match someone who is not on the list", () => {
    const v = matchFadderList([sivertRow()], {
      name: "Ukjent Person",
      email: "ukjent@stud.ntnu.no",
      studieretning: "Dataingeniør",
      klasse: "2025",
    });
    expect(v.matched).toBe(false);
    if (!v.matched) expect(v.reason).toBe("ingen-kandidat");
  });
});
