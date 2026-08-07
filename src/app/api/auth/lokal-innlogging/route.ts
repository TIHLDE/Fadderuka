import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSession,
} from "~/server/auth/config";
import { verifyPassword } from "~/server/auth/password";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordFailedLogin,
} from "~/server/auth/rate-limit";
import { db } from "~/server/db";

/**
 * The way back in for students who registered here without an @stud.ntnu.no
 * address.
 *
 * "Logg inn med TIHLDE" cannot serve them yet: Photon refuses a sign-in until
 * the verification mail is clicked, and their membership is not activated until
 * an admin or a Feide login does it. They have already paid by then, so leaving
 * them outside the app is not an option. This accepts the password they chose
 * at registration, against the local scrypt hash, and mints the same session
 * every other route would.
 *
 * Deliberately talks to nobody: no Photon call, no TIHLDE profile refresh. It
 * exists precisely for the window where Photon will not answer for this user,
 * so a dependency on Photon here would defeat the point. Everything derived
 * from the profile — cohort, study programme, admin status — is refreshed the
 * first time they do sign in through TIHLDE, which is also when the local hash
 * is dropped (see `src/app/api/auth/callback/route.ts`).
 */

const bodySchema = z.object({
  user_id: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Fyll inn brukernavn og passord." },
      { status: 400 },
    );
  }

  const { user_id, password } = parsed.data;
  const userId = user_id.toLowerCase();

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  // Spend-the-budget check before the lookup, so a blocked attempt costs
  // nothing. The message is the same whether or not the username exists —
  // otherwise this would answer that question for free.
  const limit = await checkLoginRateLimit(userId, ip);
  if (limit.blocked) {
    return NextResponse.json(
      {
        error: `For mange innloggingsforsøk. Prøv igjen om ${limit.retryAfterMinutes} minutter.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterMinutes * 60) },
      },
    );
  }

  const user = await db.user.findUnique({
    where: { tihldeUserId: userId },
    select: { id: true, passwordHash: true, isVerified: true },
  });

  /**
   * One answer for "no such user", "no local password", "must reset" and
   * "wrong password". They are the same fact to anyone who is not the account
   * holder, and telling them apart is how an attacker enumerates who
   * registered here.
   *
   * The text leads with the reset, because that is what the great majority of
   * people hitting this actually need: the cutover destroyed the stored hashes,
   * so everyone who registered before it must set a new password. `code` lets
   * the login page render «Glemt passord» as a link — the string is kept as the
   * fallback for anything reading the API directly.
   */
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await recordFailedLogin(userId, ip);
    return NextResponse.json(
      {
        code: "ma_sette_nytt_passord",
        error:
          "Vi har lansert ny hovedside, og du må sette nytt passord via «Glemt passord». Om du har godkjent TIHLDE-bruker, logg inn med den i stedet.",
      },
      { status: 401 },
    );
  }

  const { token: sessionToken, expiresAt } = await createSession({
    userId: user.id,
    photonAccessToken: null,
    ipAddress: ip,
    userAgent: hdrs.get("user-agent"),
  });

  // Proving they know the password also clears whatever failures came before.
  await clearLoginFailures(userId, ip);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    expires: expiresAt,
  });

  // `verified` lets the client skip straight to the app for users who don't owe
  // a payment, instead of bouncing them through the paywall.
  return NextResponse.json({ ok: true, verified: user.isVerified });
}
