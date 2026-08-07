import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { anonCaller, callerFor } from "../helpers/caller";
import {
  addMember,
  createAdmin,
  createGruppe,
  createMember,
  db,
  publishGrupper,
} from "../helpers/db";

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy(
    (err: unknown) => err instanceof TRPCError && err.code === code,
    `forventet TRPCError med kode ${code}`,
  );
}

describe("gruppe.getMyGruppe", () => {
  it("gir medlemskapet med alle gruppemedlemmene", async () => {
    const gruppe = await createGruppe("Gruppe 1");
    const fadder = await createMember({ name: "Fadder" });
    const barn = await createMember({ name: "Barn" });
    await addMember(fadder.id, gruppe.id, "FADDER");
    await addMember(barn.id, gruppe.id, "FADDERBARN");
    await publishGrupper();

    const membership = await callerFor(barn).gruppe.getMyGruppe();

    expect(membership?.role).toBe("FADDERBARN");
    expect(membership?.gruppe.name).toBe("Gruppe 1");
    expect(membership?.gruppe.members.map((m) => m.user.name).sort()).toEqual([
      "Barn",
      "Fadder",
    ]);
  });

  it("gir null for en bruker uten gruppe", async () => {
    const user = await createMember();
    await expect(callerFor(user).gruppe.getMyGruppe()).resolves.toBeNull();
  });

  it("krever innlogging", async () => {
    await expectCode(anonCaller().gruppe.getMyGruppe(), "UNAUTHORIZED");
  });
});

describe("publisering av faddergruppene", () => {
  it("skjuler gruppa for et fadderbarn før publisering", async () => {
    const gruppe = await createGruppe();
    const barn = await createMember();
    await addMember(barn.id, gruppe.id, "FADDERBARN");

    await expect(callerFor(barn).gruppe.getMyGruppe()).resolves.toBeNull();
    await expectCode(
      callerFor(barn).gruppe.getMessages({
        gruppeId: gruppe.id,
        channel: "ANNOUNCEMENT",
      }),
      "FORBIDDEN",
    );
    await expectCode(
      callerFor(barn).gruppe.postMessage({
        gruppeId: gruppe.id,
        content: "hei",
        channel: "CHAT",
      }),
      "FORBIDDEN",
    );
  });

  it("lar fadderen se og forberede gruppa før publisering", async () => {
    const gruppe = await createGruppe();
    const fadder = await createMember();
    await addMember(fadder.id, gruppe.id, "FADDER");

    await expect(
      callerFor(fadder).gruppe.getMyGruppe(),
    ).resolves.toMatchObject({ role: "FADDER" });
    await expect(
      callerFor(fadder).gruppe.postMessage({
        gruppeId: gruppe.id,
        content: "Velkommen!",
        channel: "ANNOUNCEMENT",
      }),
    ).resolves.toMatchObject({ content: "Velkommen!" });
  });

  it("varsler ikke fadderbarna om meldinger skrevet før publisering", async () => {
    const gruppe = await createGruppe();
    const fadder = await createMember();
    const annenFadder = await createMember();
    const barn = await createMember();
    await addMember(fadder.id, gruppe.id, "FADDER");
    await addMember(annenFadder.id, gruppe.id, "FADDER");
    await addMember(barn.id, gruppe.id, "FADDERBARN");

    await callerFor(fadder).gruppe.postMessage({
      gruppeId: gruppe.id,
      content: "Velkommen!",
      channel: "ANNOUNCEMENT",
    });

    const notifications = await db.notification.findMany();
    expect(notifications.map((n) => n.userId)).toEqual([annenFadder.id]);
  });

  it("åpner gruppa for fadderbarnet når den publiseres", async () => {
    const gruppe = await createGruppe("Gruppe 1");
    const barn = await createMember();
    await addMember(barn.id, gruppe.id, "FADDERBARN");

    await publishGrupper();

    await expect(callerFor(barn).gruppe.getMyGruppe()).resolves.toMatchObject({
      gruppe: { name: "Gruppe 1" },
    });
  });

  it("slipper admin inn uansett", async () => {
    const gruppe = await createGruppe();
    const admin = await createAdmin();

    await expect(
      callerFor(admin).gruppe.getMessages({
        gruppeId: gruppe.id,
        channel: "ANNOUNCEMENT",
      }),
    ).resolves.toEqual([]);
  });

  it("rapporterer publiseringsstatusen", async () => {
    const user = await createMember();

    await expect(callerFor(user).gruppe.getPublication()).resolves.toEqual({
      published: false,
    });

    await publishGrupper();

    await expect(callerFor(user).gruppe.getPublication()).resolves.toEqual({
      published: true,
    });
  });
});

describe("gruppe.getMessages", () => {
  it("gir bare meldingene i den valgte kanalen", async () => {
    const gruppe = await createGruppe();
    const fadder = await createMember();
    await addMember(fadder.id, gruppe.id, "FADDER");
    await db.groupMessage.createMany({
      data: [
        { content: "kunngjøring", authorId: fadder.id, gruppeId: gruppe.id, channel: "ANNOUNCEMENT" },
        { content: "chat", authorId: fadder.id, gruppeId: gruppe.id, channel: "CHAT" },
      ],
    });

    const messages = await callerFor(fadder).gruppe.getMessages({
      gruppeId: gruppe.id,
      channel: "CHAT",
    });

    expect(messages.map((m) => m.content)).toEqual(["chat"]);
  });

  it("stenger ute brukere som ikke er medlem", async () => {
    const gruppe = await createGruppe();
    const outsider = await createMember();

    await expectCode(
      callerFor(outsider).gruppe.getMessages({
        gruppeId: gruppe.id,
        channel: "CHAT",
      }),
      "FORBIDDEN",
    );
  });

  it("slipper admin inn i alle grupper", async () => {
    const gruppe = await createGruppe();
    const admin = await createAdmin();

    await expect(
      callerFor(admin).gruppe.getMessages({
        gruppeId: gruppe.id,
        channel: "CHAT",
      }),
    ).resolves.toEqual([]);
  });
});

describe("gruppe.postMessage", () => {
  it("lar en fadder poste kunngjøringer", async () => {
    const gruppe = await createGruppe();
    const fadder = await createMember();
    await addMember(fadder.id, gruppe.id, "FADDER");

    const created = await callerFor(fadder).gruppe.postMessage({
      gruppeId: gruppe.id,
      content: "Oppmøte kl 18",
      channel: "ANNOUNCEMENT",
    });

    expect(created.content).toBe("Oppmøte kl 18");
    expect(created.author.id).toBe(fadder.id);
  });

  it("lar et fadderbarn chatte, men ikke kunngjøre", async () => {
    const gruppe = await createGruppe();
    const barn = await createMember();
    await addMember(barn.id, gruppe.id, "FADDERBARN");
    await publishGrupper();
    const caller = callerFor(barn);

    await expect(
      caller.gruppe.postMessage({
        gruppeId: gruppe.id,
        content: "hei",
        channel: "CHAT",
      }),
    ).resolves.toMatchObject({ channel: "CHAT" });

    await expectCode(
      caller.gruppe.postMessage({
        gruppeId: gruppe.id,
        content: "hei",
        channel: "ANNOUNCEMENT",
      }),
      "FORBIDDEN",
    );
  });

  it("stenger ute brukere som ikke er medlem", async () => {
    const gruppe = await createGruppe();
    const outsider = await createMember();

    await expectCode(
      callerFor(outsider).gruppe.postMessage({
        gruppeId: gruppe.id,
        content: "hei",
        channel: "CHAT",
      }),
      "FORBIDDEN",
    );
    expect(await db.groupMessage.count()).toBe(0);
  });

  it("varsler de andre medlemmene, men ikke avsenderen", async () => {
    const gruppe = await createGruppe();
    const fadder = await createMember({ name: "Kari" });
    const barn1 = await createMember();
    const barn2 = await createMember();
    await addMember(fadder.id, gruppe.id, "FADDER");
    await addMember(barn1.id, gruppe.id, "FADDERBARN");
    await addMember(barn2.id, gruppe.id, "FADDERBARN");
    await publishGrupper();

    await callerFor(fadder).gruppe.postMessage({
      gruppeId: gruppe.id,
      content: "Oppmøte kl 18",
      channel: "ANNOUNCEMENT",
    });

    const notifications = await db.notification.findMany();
    expect(notifications).toHaveLength(2);
    expect(notifications.map((n) => n.userId).sort()).toEqual(
      [barn1.id, barn2.id].sort(),
    );
    expect(notifications[0]!.message).toContain("Kari");
    expect(notifications[0]!.message).toContain("kunngjøring");
  });

  it("merker chat-varsler som melding", async () => {
    const gruppe = await createGruppe();
    const fadder = await createMember();
    const barn = await createMember();
    await addMember(fadder.id, gruppe.id, "FADDER");
    await addMember(barn.id, gruppe.id, "FADDERBARN");
    await publishGrupper();

    await callerFor(fadder).gruppe.postMessage({
      gruppeId: gruppe.id,
      content: "hei",
      channel: "CHAT",
    });

    const notification = await db.notification.findFirstOrThrow();
    expect(notification.message).toContain("melding");
  });

  it("avviser tomme og altfor lange meldinger", async () => {
    const gruppe = await createGruppe();
    const fadder = await createMember();
    await addMember(fadder.id, gruppe.id, "FADDER");
    const caller = callerFor(fadder);

    await expectCode(
      caller.gruppe.postMessage({ gruppeId: gruppe.id, content: "" }),
      "BAD_REQUEST",
    );
    await expectCode(
      caller.gruppe.postMessage({ gruppeId: gruppe.id, content: "a".repeat(2001) }),
      "BAD_REQUEST",
    );
  });
});

describe("gruppe.deleteMessage", () => {
  it("lar forfatteren slette sin egen melding", async () => {
    const gruppe = await createGruppe();
    const fadder = await createMember();
    await addMember(fadder.id, gruppe.id, "FADDER");
    const message = await db.groupMessage.create({
      data: { content: "hei", authorId: fadder.id, gruppeId: gruppe.id },
    });

    await callerFor(fadder).gruppe.deleteMessage({ messageId: message.id });

    expect(await db.groupMessage.count()).toBe(0);
  });

  it("lar admin slette andres meldinger", async () => {
    const gruppe = await createGruppe();
    const fadder = await createMember();
    const admin = await createAdmin();
    await addMember(fadder.id, gruppe.id, "FADDER");
    const message = await db.groupMessage.create({
      data: { content: "hei", authorId: fadder.id, gruppeId: gruppe.id },
    });

    await callerFor(admin).gruppe.deleteMessage({ messageId: message.id });

    expect(await db.groupMessage.count()).toBe(0);
  });

  it("nekter andre medlemmer å slette", async () => {
    const gruppe = await createGruppe();
    const fadder = await createMember();
    const barn = await createMember();
    await addMember(fadder.id, gruppe.id, "FADDER");
    await addMember(barn.id, gruppe.id, "FADDERBARN");
    const message = await db.groupMessage.create({
      data: { content: "hei", authorId: fadder.id, gruppeId: gruppe.id },
    });

    await expectCode(
      callerFor(barn).gruppe.deleteMessage({ messageId: message.id }),
      "FORBIDDEN",
    );
    expect(await db.groupMessage.count()).toBe(1);
  });

  it("gir NOT_FOUND for en melding som ikke finnes", async () => {
    const user = await createMember();
    await expectCode(
      callerFor(user).gruppe.deleteMessage({ messageId: "finnes-ikke" }),
      "NOT_FOUND",
    );
  });
});
