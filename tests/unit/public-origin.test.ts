import { describe, expect, it } from "vitest";

import { publicOrigin } from "~/server/public-origin";

describe("publicOrigin", () => {
  it("bruker APP_URL, ikke adressen serveren lytter på bak nginx", () => {
    // Drift: the standalone server sees its own bind address in request.url.
    const request = new Request("http://0.0.0.0:3000/api/auth/logg-inn");
    expect(publicOrigin(request)).toBe("https://fadderuka.test");
  });

  it("gir bare origin, uten sti eller avsluttende skråstrek", () => {
    const request = new Request("http://0.0.0.0:3000/api/auth/callback?x=1");
    expect(new URL("/logg-inn", publicOrigin(request)).toString()).toBe(
      "https://fadderuka.test/logg-inn",
    );
  });
});
