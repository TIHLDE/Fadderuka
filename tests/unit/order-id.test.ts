import { describe, expect, it } from "vitest";

import {
  buildOrderId,
  parseUserIdFromOrderId,
} from "~/server/payment/vipps";

describe("orderId", () => {
  it("er rundturs-stabil for cuid-er", () => {
    const userId = "cmd1x2y3z0000abcdefghijkl";
    expect(parseUserIdFromOrderId(buildOrderId(userId))).toBe(userId);
  });

  it("holder seg innenfor Vipps' 50-tegns referansegrense", () => {
    // Vipps avviser lengre referanser med 400 — jf. kommentaren i vipps.ts.
    expect(buildOrderId("cmd1x2y3z0000abcdefghijkl").length).toBeLessThanOrEqual(50);
  });

  it("gir null for referanser som ikke er våre", () => {
    expect(parseUserIdFromOrderId("noe-helt-annet")).toBeNull();
    expect(parseUserIdFromOrderId("fadderuka-uten-timestamp")).toBeNull();
    expect(parseUserIdFromOrderId("")).toBeNull();
  });
});
