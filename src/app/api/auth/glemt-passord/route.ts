import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createResetToken,
  sendResetEmail,
} from "~/server/auth/password-reset";
import { checkResetRateLimit, recordResetAttempt } from "~/server/auth/rate-limit";
import { db } from "~/server/db";
import { isEmailConfigured } from "~/server/email/photon";

/**
 * Ask for a password reset link.
 *
 * Only accounts that actually have a local password get one. For everyone else
 * tihlde.org owns the password, and minting a local one from an email link
 * would be a second door into an approved TIHLDE account — see
 * `src/server/auth/password-reset.ts`.
 *
 * The answer is the same either way: whether an account exists, whether it has
 * a local password, and whether the mail went out are all invisible from the
 * outside. Otherwise this endpoint would answer "does this person have an
 * account here?" for anyone who asks.
 */

const bodySchema = z.object({
  user_id: z.string().min(1, "Fyll inn brukernavnet eller e-posten din."),
});

/** Same answer for every outcome. */
const GENERIC_OK = {
  ok: true,
  message:
    "Har du en bruker her, sender vi deg en e-post med en lenke. Sjekk også søppelposten.",
};

async function clientIp(): Promise<string | null> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ugyldig forespørsel." },
      { status: 400 },
    );
  }

  // Without a mail key nothing can be sent, and claiming otherwise would leave
  // people waiting for an email that never comes.
  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Tilbakestilling av passord er ikke tilgjengelig akkurat nå. Ta kontakt med fadderkomiteen.",
      },
      { status: 503 },
    );
  }

  const userId = parsed.data.user_id.trim().toLowerCase();
  const ip = await clientIp();

  const limit = await checkResetRateLimit(userId, ip);
  if (limit.blocked) {
    return NextResponse.json(
      {
        error: `For mange forespørsler. Prøv igjen om ${limit.retryAfterMinutes} minutter.`,
      },
      { status: 429 },
    );
  }

  // Username or e-mail. Several of the students this exists for signed up
  // weeks ago and no longer remember the username they picked, while the
  // address they used is the one thing they are sure of. The answer is generic
  // either way, so accepting both tells an outsider nothing new.
  const user = await db.user.findFirst({
    where: {
      OR: [
        { tihldeUserId: userId },
        { email: { equals: userId, mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true, passwordHash: true, tihldeUserId: true },
  });

  // No account, no local password, or no address to send to: answer as if it
  // worked. `passwordHash` is null for everyone TIHLDE authenticates.
  if (!user?.passwordHash || !user.email) {
    return NextResponse.json(GENERIC_OK);
  }

  await recordResetAttempt(userId, ip);

  try {
    const token = await createResetToken(user.id);
    await sendResetEmail({
      to: user.email,
      tihldeUserId: user.tihldeUserId,
      token,
    });
  } catch (error) {
    // Logged for us, invisible to the caller: a failing mail provider must not
    // become a way to probe which usernames exist.
    console.error("Klarte ikke sende reset-e-post:", error);
  }

  return NextResponse.json(GENERIC_OK);
}
