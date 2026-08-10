import { describe, expect, it } from "vitest";

import { getGroupLinks } from "~/components/layout/header/nav-links";

const hrefs = (isAdmin?: boolean, isGruppeMember?: boolean) =>
  getGroupLinks(isAdmin, isGruppeMember).map((link) => link.href);

describe("getGroupLinks", () => {
  it("gir admin som også er i en gruppe begge lenkene", () => {
    expect(hrefs(true, true)).toEqual(["/admin", "/faddergruppe"]);
  });

  it("gir admin uten gruppe bare adminpanelet", () => {
    expect(hrefs(true, false)).toEqual(["/admin"]);
  });

  it("gir gruppemedlem uten admin bare faddergruppa", () => {
    expect(hrefs(false, true)).toEqual(["/faddergruppe"]);
  });

  it("gir ingen lenker til bruker uten admin eller gruppe", () => {
    expect(hrefs(false, false)).toEqual([]);
  });

  it("setter admin først, så bunnlinja velger adminpanelet i raden", () => {
    expect(getGroupLinks(true, true)[0]?.href).toBe("/admin");
  });
});
