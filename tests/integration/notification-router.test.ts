import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { anonCaller, callerFor } from "../helpers/caller";
import { createGruppe, createUser, db } from "../helpers/db";

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy(
    (err: unknown) => err instanceof TRPCError && err.code === code,
    `forventet TRPCError med kode ${code}`,
  );
}

async function notify(userId: string, gruppeId: string, message: string, read = false) {
  return db.notification.create({ data: { userId, gruppeId, message, read } });
}

describe("notification", () => {
  it("lister bare brukerens egne varsler, nyeste først", async () => {
    const gruppe = await createGruppe();
    const user = await createUser();
    const other = await createUser();
    await notify(user.id, gruppe.id, "første");
    await notify(user.id, gruppe.id, "andre");
    await notify(other.id, gruppe.id, "andres");

    const list = await callerFor(user).notification.list();

    expect(list.map((n) => n.message)).toEqual(["andre", "første"]);
  });

  it("teller bare uleste varsler", async () => {
    const gruppe = await createGruppe();
    const user = await createUser();
    await notify(user.id, gruppe.id, "ulest");
    await notify(user.id, gruppe.id, "lest", true);

    await expect(callerFor(user).notification.unreadCount()).resolves.toBe(1);
  });

  it("markerer ett varsel som lest", async () => {
    const gruppe = await createGruppe();
    const user = await createUser();
    const notification = await notify(user.id, gruppe.id, "hei");

    await callerFor(user).notification.markRead({ id: notification.id });

    expect(
      (await db.notification.findUniqueOrThrow({ where: { id: notification.id } })).read,
    ).toBe(true);
  });

  it("kan ikke markere en annens varsel som lest", async () => {
    const gruppe = await createGruppe();
    const user = await createUser();
    const other = await createUser();
    const notification = await notify(other.id, gruppe.id, "hei");

    // updateMany er scopet på userId, så kallet lykkes men treffer ingenting.
    await expect(
      callerFor(user).notification.markRead({ id: notification.id }),
    ).resolves.toEqual({ count: 0 });
    expect(
      (await db.notification.findUniqueOrThrow({ where: { id: notification.id } })).read,
    ).toBe(false);
  });

  it("markerer alle egne varsler som lest, og ingen andres", async () => {
    const gruppe = await createGruppe();
    const user = await createUser();
    const other = await createUser();
    await notify(user.id, gruppe.id, "a");
    await notify(user.id, gruppe.id, "b");
    await notify(other.id, gruppe.id, "c");

    await callerFor(user).notification.markAllRead();

    expect(await db.notification.count({ where: { read: false } })).toBe(1);
    expect(await db.notification.count({ where: { userId: other.id, read: false } })).toBe(1);
  });

  it("krever innlogging", async () => {
    await expectCode(anonCaller().notification.list(), "UNAUTHORIZED");
    await expectCode(anonCaller().notification.unreadCount(), "UNAUTHORIZED");
    await expectCode(anonCaller().notification.markAllRead(), "UNAUTHORIZED");
  });
});
