import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  REGISTRATION_STUDY_SLUGS,
  studyLabelForSlug,
} from "~/lib/majors";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSession,
} from "~/server/auth/config";
import { hashPassword } from "~/server/auth/password";
import {
  checkRegisterRateLimit,
  recordRegisterAttempt,
} from "~/server/auth/rate-limit";
import {
  TihldeAuthError,
  TihldeUnavailableError,
  tihldeCreateUser,
} from "~/server/auth/tihlde";
import { db } from "~/server/db";
import { isUniqueConstraintError, uniqueConstraintField } from "~/server/db-errors";

/**
 * Self-registration for brand-new students during fadderuka.
 *
 * Creates a REAL (but pending-approval) TIHLDE account via Lepton's public
 * `POST /users/`, mirrors it into our local user table, and mints our own
 * session so the user gets straight into the app. Payment (Vipps) is handled
 * separately by the client after this succeeds.
 *
 * The password is forwarded to TIHLDE; we additionally keep a local scrypt hash
 * of it so the user can log back in here while their TIHLDE account still
 * awaits admin approval (Lepton rejects logins for pending accounts). The
 * plaintext is never stored or logged.
 */

const bodySchema = z.object({
  full_name: z.string().trim().min(1, "Fyll inn fullt navn."),
  email: z.string().trim().email("Ugyldig e-postadresse."),
  user_id: z
    .string()
    .trim()
    .min(1, "Feltet er påkrevd")
    // Match Kvark's exact wording; the 15-char cap mirrors Lepton's model limit
    // (Kvark leaves that to the backend — we surface it up front).
    .max(15, "Brukernavn kan være maks 15 tegn.")
    .refine((v) => !v.includes("@"), "Brukernavn må være uten @stud.ntnu.no"),
  password: z.string().min(8, "Passordet må være minst 8 tegn."),
  study: z.enum(REGISTRATION_STUDY_SLUGS, {
    errorMap: () => ({ message: "Velg hvilken linje du går på." }),
  }),
});

/** Split a full name into first + last for TIHLDE (which stores them apart). */
function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  const first = parts.shift() ?? fullName;
  // TIHLDE requires a last name; fall back to the first name when only one word.
  const last = parts.length > 0 ? parts.join(" ") : first;
  return { first, last };
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error?.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Ugyldig skjema.", field: first?.path[0] },
      { status: 400 },
    );
  }

  const { full_name, email, user_id, password, study } = parsed.data;
  const userId = user_id.toLowerCase();
  const { first, last } = splitName(full_name);
  const studieretning = studyLabelForSlug(study);

  // This route creates real TIHLDE accounts, so an unthrottled one is an open
  // account-creation proxy for tihlde.org running under our IP. Checked before
  // we call Lepton, so a blocked attempt costs neither side anything.
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const limit = await checkRegisterRateLimit(ip);
  if (limit.blocked) {
    return NextResponse.json(
      {
        error: `For mange registreringer herfra. Prøv igjen om ${limit.retryAfterMinutes} minutter.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterMinutes * 60) },
      },
    );
  }
  await recordRegisterAttempt(ip);

  // 1. Refuse a duplicate before anything irreversible happens, and say who
  //    they already are. Registering twice is the single most common way to
  //    fail here: a student whose Vipps payment didn't complete comes back and
  //    signs up again, often with a different username. Their own first
  //    registration then owns the email, and the unique constraint used to
  //    surface as "Noe gikk galt" — which reads as "you did something wrong"
  //    rather than "you already have an account".
  const clash = await db.user.findFirst({
    where: {
      OR: [
        { tihldeUserId: userId },
        { email: { equals: email, mode: "insensitive" } },
      ],
    },
    select: { tihldeUserId: true, email: true },
  });

  if (clash) {
    const sameUsername = clash.tihldeUserId === userId;
    return NextResponse.json(
      {
        error: sameUsername
          ? `Du er allerede registrert som «${clash.tihldeUserId}». Logg inn i stedet — har du glemt passordet, spør en fadder om å nullstille det.`
          : `E-posten er allerede brukt av brukeren «${clash.tihldeUserId}». Logg inn som «${clash.tihldeUserId}», eller registrer deg med en annen e-post.`,
        field: sameUsername ? "user_id" : "email",
        // The client sends them to the login page rather than making them
        // guess what to change.
        existingUserId: clash.tihldeUserId,
      },
      { status: 409 },
    );
  }

  try {
    // 2. Create OUR row first, because it is the one we can undo.
    //
    //    This used to run after `tihldeCreateUser`, and the ordering was the
    //    real damage in the incident above: the TIHLDE account was already
    //    created on tihlde.org by the time the local insert failed, leaving
    //    orphaned accounts nobody could clean up from here. A local row, by
    //    contrast, is ours to delete — see the rollback below.
    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        tihldeUserId: userId,
        name: full_name,
        email,
        studieretning,
        isVerified: false,
        hasPaid: false,
        isAdmin: false,
        passwordHash,
      },
    });

    // 3. Create the real TIHLDE account (pending admin approval). class:null —
    //    the study membership is enough; the year group may not exist yet.
    //    On failure the local row is rolled back, so a retry starts clean
    //    instead of hitting the duplicate check above.
    try {
      await tihldeCreateUser({
        user_id: userId,
        password,
        first_name: first,
        last_name: last,
        email,
        study,
        class: null,
      });
    } catch (err) {
      await db.user
        .delete({ where: { id: user.id } })
        .catch((cleanupErr) =>
          console.error("[auth/register] rollback failed", cleanupErr),
        );
      throw err;
    }

    // 4. Mint our own session (no TIHLDE token — the account isn't activated
    //    yet) and set the httpOnly cookie so they're logged into the app.
    const { token: sessionToken, expiresAt } = await createSession({
      userId: user.id,
      tihldeToken: null,
      ipAddress: ip,
      userAgent: hdrs.get("user-agent"),
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
      expires: expiresAt,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // TIHLDE unreachable — nothing to do with what they typed, so say that
    // plainly instead of sending them back to re-check the form.
    if (err instanceof TihldeUnavailableError) {
      console.error("[auth/register] TIHLDE unreachable", err.cause);
      return NextResponse.json(
        { error: err.message },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }

    if (err instanceof TihldeAuthError) {
      // 400 from Lepton (duplicate username, bad email, …) → show the message
      // and hint the client which field it belongs to when we can tell.
      const status = err.status >= 400 && err.status < 500 ? 400 : 502;
      const field = /brukernavn/i.test(err.message)
        ? "user_id"
        : /e-?post/i.test(err.message)
          ? "email"
          : undefined;
      return NextResponse.json({ error: err.message, field }, { status });
    }

    // A duplicate that slipped past the check above — two submits racing each
    // other. Same advice as the pre-flight case, since it is the same problem.
    if (isUniqueConstraintError(err)) {
      return NextResponse.json(
        {
          error:
            "Du er allerede registrert. Prøv å logge inn i stedet — har du glemt passordet, spør en fadder om å nullstille det.",
          field: uniqueConstraintField(err),
        },
        { status: 409 },
      );
    }

    console.error("[auth/register] unexpected error", err);
    return NextResponse.json(
      {
        error:
          "Noe gikk galt hos oss under registreringen. Prøv igjen — går det ikke, si fra til en fadder.",
      },
      { status: 500 },
    );
  }
}
