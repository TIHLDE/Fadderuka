import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { anonCaller, callerFor } from "../helpers/caller";
import { createUser, db } from "../helpers/db";

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy(
    (err: unknown) => err instanceof TRPCError && err.code === code,
    `forventet TRPCError med kode ${code}`,
  );
}

describe("profile.setGender", () => {
  it("lagrer kjønnet til den innloggede brukeren", async () => {
    const user = await createUser({ isVerified: true });

    await expect(
      callerFor(user).profile.setGender({ gender: "MANN" }),
    ).resolves.toEqual({ gender: "MANN" });

    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).gender,
    ).toBe("MANN");
  });

  // En TIHLDE-innlogging som ikke har betalt ennå, må også kunne svare.
  it("virker for en som ikke har tilgang til appen ennå", async () => {
    const user = await createUser({ isVerified: false });

    await callerFor(user).profile.setGender({ gender: "ANNET" });

    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).gender,
    ).toBe("ANNET");
  });

  it("endrer aldri andres kjønn", async () => {
    const user = await createUser();
    const other = await createUser();

    await callerFor(user).profile.setGender({ gender: "KVINNE" });

    expect(
      (await db.user.findUniqueOrThrow({ where: { id: other.id } })).gender,
    ).toBeNull();
  });

  it("avviser ukjente verdier", async () => {
    const user = await createUser();

    await expectCode(
      callerFor(user).profile.setGender({ gender: "ukjent" as never }),
      "BAD_REQUEST",
    );
  });

  it("krever innlogging", async () => {
    await expectCode(
      anonCaller().profile.setGender({ gender: "MANN" }),
      "UNAUTHORIZED",
    );
  });
});
