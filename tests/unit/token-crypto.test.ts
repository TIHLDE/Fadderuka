import { describe, expect, it } from "vitest";

import {
  canStoreTihldeToken,
  decryptToken,
  encryptToken,
} from "~/server/auth/token-crypto";

describe("token-kryptering", () => {
  it("krypterer og dekrypterer tokenet uskadd", () => {
    const encrypted = encryptToken("tihlde-token");

    expect(encrypted).not.toBeNull();
    expect(encrypted).not.toBe("tihlde-token");
    expect(decryptToken(encrypted)).toBe("tihlde-token");
  });

  it("gir ulik chiffertekst hver gang, så like tokens ikke kan kjennes igjen", () => {
    // Ny tilfeldig nonce per kryptering.
    expect(encryptToken("samme")).not.toBe(encryptToken("samme"));
  });

  it("håndterer tomt og manglende token", () => {
    expect(encryptToken(null)).toBeNull();
    expect(encryptToken("")).toBeNull();
    expect(decryptToken(null)).toBeNull();
  });

  it("leser gamle, ukrypterte verdier som de er", () => {
    // Rader skrevet før krypteringen fantes skal fortsatt virke, og byttes ut
    // ved neste innlogging.
    expect(decryptToken("gammelt-klartekst-token")).toBe("gammelt-klartekst-token");
  });

  it("returnerer null for tuklet chiffertekst i stedet for å kaste", () => {
    const encrypted = encryptToken("tihlde-token")!;
    const [scheme, iv, tag] = encrypted.split(".");

    // Bytter ut selve dataene, men beholder autentiseringstaggen.
    const tampered = [scheme, iv, tag, Buffer.from("tuklet").toString("base64")].join(".");
    expect(decryptToken(tampered)).toBeNull();

    // Og en helt ødelagt struktur.
    expect(decryptToken("v1.bare-tull")).toBeNull();
  });

  it("melder at lagring er mulig når nøkkelen er satt", () => {
    expect(canStoreTihldeToken()).toBe(true);
  });
});
