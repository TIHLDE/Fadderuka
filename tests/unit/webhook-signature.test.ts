import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  verifyVippsWebhookSignature,
  webhookPartsFromRequest,
  type VippsWebhookRequestParts,
} from "~/server/payment/webhook-signature";

const SECRET = "webhook-secret";

/** Sign a request exactly the way Vipps does, so the happy path is real. */
function signed(
  overrides: Partial<VippsWebhookRequestParts> = {},
  secret = SECRET,
): VippsWebhookRequestParts {
  const rawBody = overrides.rawBody ?? JSON.stringify({ reference: "abc" });
  const method = overrides.method ?? "POST";
  const pathAndQuery = overrides.pathAndQuery ?? "/api/vipps/webhook";
  const host = overrides.host ?? "fadderuka.test";
  const date = overrides.date ?? "Mon, 02 Aug 2026 12:00:00 GMT";

  const contentSha256 = createHash("sha256")
    .update(rawBody, "utf-8")
    .digest("base64");

  const signature = createHmac("sha256", secret)
    .update(
      `${method}\n${pathAndQuery}\n${date};${host};${contentSha256}`,
      "utf-8",
    )
    .digest("base64");

  return {
    method,
    pathAndQuery,
    host,
    date,
    contentSha256,
    authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
    rawBody,
    ...overrides,
  };
}

describe("verifyVippsWebhookSignature", () => {
  it("godtar en ekte signatur fra Vipps", () => {
    expect(verifyVippsWebhookSignature(signed(), SECRET)).toBe(true);
  });

  it("avviser en signatur laget med feil hemmelighet", () => {
    expect(verifyVippsWebhookSignature(signed({}, "feil-hemmelighet"), SECRET)).toBe(
      false,
    );
  });

  it("avviser en endret body", () => {
    // Signaturen dekker innholdshashen, så en byttet body må falle.
    const parts = signed();
    expect(
      verifyVippsWebhookSignature(
        { ...parts, rawBody: JSON.stringify({ reference: "en-annen-ordre" }) },
        SECRET,
      ),
    ).toBe(false);
  });

  it("avviser når innholdshashen ikke stemmer med bodyen", () => {
    const parts = signed();
    expect(
      verifyVippsWebhookSignature(
        { ...parts, contentSha256: createHash("sha256").update("noe annet").digest("base64") },
        SECRET,
      ),
    ).toBe(false);
  });

  it("avviser når sti, host eller dato er byttet ut", () => {
    for (const override of [
      { pathAndQuery: "/api/vipps/annet" },
      { host: "angriper.test" },
      { date: "Tue, 03 Aug 2026 12:00:00 GMT" },
    ]) {
      const parts = { ...signed(), ...override };
      expect(verifyVippsWebhookSignature(parts, SECRET)).toBe(false);
    }
  });

  it("avviser en manglende eller ukjent Authorization-header", () => {
    expect(
      verifyVippsWebhookSignature({ ...signed(), authorization: "" }, SECRET),
    ).toBe(false);
    expect(
      verifyVippsWebhookSignature(
        { ...signed(), authorization: "Bearer noe" },
        SECRET,
      ),
    ).toBe(false);
  });

  it("avviser når dato eller innholdshash mangler helt", () => {
    expect(verifyVippsWebhookSignature({ ...signed(), date: "" }, SECRET)).toBe(
      false,
    );
    expect(
      verifyVippsWebhookSignature({ ...signed(), contentSha256: "" }, SECRET),
    ).toBe(false);
  });
});

describe("webhookPartsFromRequest", () => {
  it("plukker ut delene signaturen dekker", () => {
    const rawBody = JSON.stringify({ reference: "abc" });
    const request = new Request("https://fadderuka.test/api/vipps/webhook?x=1", {
      method: "POST",
      headers: {
        host: "fadderuka.test",
        "x-ms-date": "Mon, 02 Aug 2026 12:00:00 GMT",
        "x-ms-content-sha256": "hash",
        authorization: "HMAC-SHA256 Signature=sig",
      },
      body: rawBody,
    });

    expect(webhookPartsFromRequest(request, rawBody)).toMatchObject({
      method: "POST",
      pathAndQuery: "/api/vipps/webhook?x=1",
      host: "fadderuka.test",
      date: "Mon, 02 Aug 2026 12:00:00 GMT",
      contentSha256: "hash",
      rawBody,
    });
  });

  it("faller tilbake på date-headeren når x-ms-date mangler", () => {
    const request = new Request("https://fadderuka.test/api/vipps/webhook", {
      method: "POST",
      headers: { date: "Mon, 02 Aug 2026 12:00:00 GMT" },
      body: "{}",
    });

    expect(webhookPartsFromRequest(request, "{}").date).toBe(
      "Mon, 02 Aug 2026 12:00:00 GMT",
    );
  });
});
