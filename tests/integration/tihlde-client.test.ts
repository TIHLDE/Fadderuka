import { describe, expect, it } from "vitest";

import {
  TihldeAuthError,
  isAdminFromPermissions,
  isMemberOfGroup,
  mapProfile,
  tihldeCreateUser,
  tihldeGetMe,
  tihldeGetMemberships,
  tihldeGetPermissions,
  tihldeLogin,
} from "~/server/auth/tihlde";

import { fetchMock, json, text } from "../helpers/fetch-mock";

describe("tihldeLogin", () => {
  it("sender legitimasjonen og returnerer tokenet", async () => {
    fetchMock.on("POST", "/auth/login/", json({ token: "abc" }));

    await expect(tihldeLogin("olanor", "hemmelig")).resolves.toBe("abc");
    const [call] = fetchMock.callsTo("/auth/login/");
    expect(call?.body).toEqual({ user_id: "olanor", password: "hemmelig" });
  });

  it("videreformidler TIHLDEs norske feilmelding med statuskoden", async () => {
    fetchMock.on("POST", "/auth/login/", json({ detail: "Feil passord." }, 401));

    await expect(tihldeLogin("olanor", "feil")).rejects.toMatchObject({
      message: "Feil passord.",
      status: 401,
    });
  });

  it("faller tilbake til en standardmelding når svaret ikke er JSON", async () => {
    fetchMock.on("POST", "/auth/login/", text("<html>", 500));

    await expect(tihldeLogin("olanor", "x")).rejects.toThrow(
      /Brukernavnet eller passordet/,
    );
  });

  it("kaster når svaret mangler token", async () => {
    fetchMock.on("POST", "/auth/login/", json({}));

    await expect(tihldeLogin("olanor", "x")).rejects.toThrow(TihldeAuthError);
  });
});

describe("tihldeCreateUser", () => {
  const input = {
    user_id: "olanor",
    password: "hemmeligpassord",
    first_name: "Ola",
    last_name: "Nordmann",
    email: "ola@stud.ntnu.no",
    study: "dataingenir",
    class: null,
  };

  it("oppretter kontoen", async () => {
    fetchMock.on("POST", "/users/", json({}, 201));

    await expect(tihldeCreateUser(input)).resolves.toBeUndefined();
  });

  it.each([
    ["detail som streng", { detail: "Noe gikk galt." }, "Noe gikk galt."],
    [
      "feltfeil på toppnivå",
      { email: ["Ugyldig e-post."] },
      "Ugyldig e-post.",
    ],
    [
      "feltfeil nestet under detail",
      { detail: { email: ["Ugyldig e-post."] } },
      "Ugyldig e-post.",
    ],
  ])("leser feilmeldingen fra %s", async (_label, body, expected) => {
    fetchMock.on("POST", "/users/", json(body, 400));

    await expect(tihldeCreateUser(input)).rejects.toThrow(expected);
  });

  it("oversetter duplikat brukernavn til et innloggingshint", async () => {
    fetchMock.on("POST", "/users/", json({ user_id: ["finnes allerede"] }, 400));

    await expect(tihldeCreateUser(input)).rejects.toThrow(/Logg inn i stedet/);
  });
});

describe("profil og tilganger", () => {
  it("henter profilen med token-headeren", async () => {
    fetchMock.on("GET", "/users/me/", json({ user_id: "olanor" }));

    await tihldeGetMe("token-123");

    expect(fetchMock.callsTo("/users/me/")[0]?.headers["x-csrf-token"]).toBe("token-123");
  });

  it("mapper profilen til våre felter", () => {
    expect(
      mapProfile({
        user_id: "olanor",
        first_name: "Ola",
        last_name: "Nordmann",
        email: "ola@stud.ntnu.no",
        image: null,
        study: { group: { name: "Dataingeniør" } },
        studyyear: { group: { name: "2026" } },
      }),
    ).toEqual({
      tihldeUserId: "olanor",
      name: "Ola Nordmann",
      email: "ola@stud.ntnu.no",
      image: null,
      studieretning: "Dataingeniør",
      klasse: "2026",
    });
  });

  it("faller tilbake til brukernavnet når navnet mangler", () => {
    expect(
      mapProfile({
        user_id: "olanor",
        first_name: "",
        last_name: "",
        email: null,
        image: null,
        study: null,
        studyyear: null,
      }),
    ).toMatchObject({ name: "olanor", studieretning: null, klasse: null });
  });

  it("regner skrivetilgang som admin, lesetilgang som vanlig bruker", () => {
    expect(isAdminFromPermissions({ permissions: { event: { read: true } } })).toBe(false);
    expect(isAdminFromPermissions({ permissions: { event: { write: true } } })).toBe(true);
    expect(
      isAdminFromPermissions({ permissions: { event: { write_all: true } } }),
    ).toBe(true);
    expect(isAdminFromPermissions({ permissions: {} })).toBe(false);
  });

  it("leser medlemskap både som liste og paginert svar", async () => {
    fetchMock.once("GET", "/users/olanor/memberships/", json({ results: [{ group: { slug: "fadderkom" } }] }));
    await expect(tihldeGetMemberships("t", "olanor")).resolves.toEqual([
      { group: { slug: "fadderkom" } },
    ]);

    fetchMock.on("GET", "/users/olanor/memberships/", json([{ group: { slug: "index" } }]));
    await expect(tihldeGetMemberships("t", "olanor")).resolves.toEqual([
      { group: { slug: "index" } },
    ]);
  });

  it("gjenkjenner medlemskap i en gruppe på slug", () => {
    const memberships = [{ group: { slug: "fadderkom" } }, { group: null }];
    expect(isMemberOfGroup(memberships, "fadderkom")).toBe(true);
    expect(isMemberOfGroup(memberships, "index")).toBe(false);
  });

  it("kaster med statuskoden når tilganger ikke kan hentes", async () => {
    fetchMock.on("GET", "/users/me/permissions/", text("boom", 500));

    await expect(tihldeGetPermissions("t")).rejects.toMatchObject({ status: 500 });
  });
});
