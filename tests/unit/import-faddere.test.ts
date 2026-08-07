import { describe, expect, it } from "vitest";

import {
  decodeXml,
  normaliseHeader,
  normaliseName,
} from "../../scripts/import-faddere";

describe("normaliseName", () => {
  it("matches the same person across hyphen and middle-name differences", () => {
    expect(normaliseName("Alva Kjærstad-Leiner")).toBe(
      normaliseName("Alva Kjærstad Leiner"),
    );
  });

  it("ignores diacritics and casing", () => {
    expect(normaliseName("André Skjellevik")).toBe(
      normaliseName("andre skjellevik"),
    );
  });

  it("ignores the order the name parts are written in", () => {
    expect(normaliseName("Dyb-Sandnes, Phillip")).toBe(
      normaliseName("Phillip Dyb-Sandnes"),
    );
  });

  it("keeps different people apart", () => {
    expect(normaliseName("Sander Clemetsen")).not.toBe(
      normaliseName("Sander Elstad"),
    );
  });
});

describe("normaliseHeader", () => {
  it("folds a Google Forms question down to a matchable key", () => {
    expect(normaliseHeader("Hva er ditt fulle navn?")).toBe(
      "hvaerdittfullenavn",
    );
  });

  it("strips a leading BOM", () => {
    expect(normaliseHeader("﻿Email Address")).toBe("emailaddress");
  });
});

describe("decodeXml", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeXml("Ola &amp; Kari &lt;a&gt; &#248; &#xF8;")).toBe(
      "Ola & Kari <a> ø ø",
    );
  });

  it("leaves unknown entities alone", () => {
    expect(decodeXml("100 &nbsp; kr")).toBe("100 &nbsp; kr");
  });
});
