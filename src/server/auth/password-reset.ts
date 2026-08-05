import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { env } from "~/env";
import { db } from "~/server/db";
import { sendEmail } from "~/server/email/photon";

/**
 * Self-service password reset for the local login bridge.
 *
 * Who this is for: students who registered here while their TIHLDE account
 * waits for approval on tihlde.org. They log in with a password they chose
 * during registration, we hold the only hash of it, and until now a forgotten
 * one meant an admin had to hand out a replacement by hand.
 *
 * Who it is deliberately NOT for: accounts TIHLDE authenticates. Their
 * `passwordHash` is null — tihlde.org owns their password, and letting an
 * email link mint a local one would build a second way into an approved
 * account that bypasses TIHLDE entirely.
 */

/** How long a link works. Long enough to find the mail, short enough to matter. */
const TOKEN_TTL_MS = 60 * 60 * 1000;

/** Bytes of entropy in the token. 32 is far beyond guessable. */
const TOKEN_BYTES = 32;

/**
 * Only the hash is stored, so a database leak yields no working links. SHA-256
 * without a salt is right here (unlike for passwords): the input is 256 bits of
 * randomness, so there is nothing to brute-force or rainbow-table.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The public origin, for building the link. See `APP_URL` in `src/env.js`. */
function appUrl(): string {
  const url = env.APP_URL ?? env.VIPPS_CALLBACK_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

/**
 * Create a reset token for `userId`, invalidating any earlier unused ones so a
 * second request cannot leave two live links behind. Returns the plaintext,
 * which exists only in the returned value and the email built from it.
 */
export async function createResetToken(userId: string): Promise<string> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");

  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    db.passwordResetToken.create({
      data: {
        tokenHash: hashToken(token),
        userId,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    }),
  ]);

  return token;
}

/**
 * Look up a token and return the user it belongs to, or null when it is
 * unknown, already used or expired. The lookup is by hash, so the plaintext is
 * never compared against anything stored.
 */
export async function consumableToken(token: string) {
  if (!token) return null;

  const stored = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, tihldeUserId: true } } },
  });

  if (!stored) return null;
  if (stored.usedAt) return null;
  if (stored.expiresAt.getTime() <= Date.now()) return null;

  return stored;
}

/**
 * Spend a token: set the new password hash, mark the token used, and drop every
 * session the account has. Logging the sessions out matters — whoever asked for
 * the reset may be locking out someone who is signed in on their account right
 * now, and that is the whole point of a password reset.
 *
 * Guarded on `usedAt: null` inside the transaction so two requests racing on
 * the same link cannot both succeed.
 */
export async function consumeToken(
  tokenId: string,
  userId: string,
  passwordHash: string,
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    // Claim the token first. Losing this race has to mean writing nothing at
    // all — a batched transaction would have set the password anyway and then
    // reported failure.
    const marked = await tx.passwordResetToken.updateMany({
      where: { id: tokenId, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (marked.count !== 1) return false;

    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId } });
    return true;
  });
}

/** Build and send the reset mail through Photon. */
export async function sendResetEmail(input: {
  to: string;
  tihldeUserId: string;
  token: string;
}): Promise<void> {
  const link = `${appUrl()}/nytt-passord/${input.token}`;

  await sendEmail({
    to: input.to,
    subject: "Tilbakestill passordet ditt på Fadderuka",
    content: [
      { type: "title", content: "Glemt passord" },
      {
        type: "text",
        content: `Noen har bedt om å tilbakestille passordet for «${input.tihldeUserId}» på Fadderuka-sida. Trykk på knappen for å velge et nytt passord.`,
      },
      { type: "button", text: "Velg nytt passord", url: link },
      {
        type: "text",
        content:
          "Lenka virker i én time og kan bare brukes én gang. Har du ikke bedt om dette, kan du se bort fra e-posten — passordet ditt er uendret.",
      },
      {
        type: "text",
        content:
          "Passordet gjelder kun Fadderuka-sida. Passordet ditt på tihlde.org endres ikke.",
      },
    ],
  });
}
