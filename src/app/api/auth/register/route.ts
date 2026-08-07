import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { REGISTRATION_STUDY_SLUGS, studyLabelForSlug } from "~/lib/majors";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSession,
} from "~/server/auth/config";
import { hashPassword } from "~/server/auth/password";
import {
  PhotonAuthError,
  PhotonUnavailableError,
  photonCreateUser,
} from "~/server/auth/photon";
import {
  checkRegisterRateLimit,
  recordRegisterAttempt,
} from "~/server/auth/rate-limit";
import { db } from "~/server/db";
import {
  isUniqueConstraintError,
  uniqueConstraintField,
} from "~/server/db-errors";

/**
 * Self-registration for brand-new students during fadderuka.
 *
 * Creates a real TIHLDE account — on Photon, which is where tihlde.org lives.
 * It used to create one in Lepton, whose accounts are born pending approval and
 * which nothing has been able to approve since the migration: every student who
 * registered here got an account that could log in nowhere, and was told "Du må
 * aktiveres som TIHLDE-medlem" when they tried.
 *
 * Photon takes the password, hashes it and owns it from there. We keep a local
 * hash as well, which is the bridge these students need: Photon will not let
 * them sign in until they have clicked the verification mail, and their TIHLDE
 * membership is not activated until an admin or a Feide login does it. Without
 * it they could register and pay, then be locked out of the app they just paid
 * for. `POST /api/auth/lokal-innlogging` accepts it, and the first successful
 * TIHLDE login clears it.
 *
 * The address is deliberately NOT required to be @stud.ntnu.no. Many new
 * students have not been given theirs when they sign up on stand, and refusing
 * them is refusing the very group this form exists for. The username is
 * therefore chosen rather than derived — the form asks for the Feide one — and
 * passed to Photon explicitly. It stays the key this app stores everyone under.
 */

const bodySchema = z.object({
  full_name: z.string().trim().min(1, "Fyll inn fullt navn."),
  email: z.string().trim().toLowerCase().email("Ugyldig e-postadresse."),
  user_id: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Feltet er påkrevd")
    // Match Kvark's exact wording; the 15-char cap mirrors TIHLDE's model limit
    // (Kvark leaves that to the backend — we surface it up front).
    .max(15, "Brukernavn kan være maks 15 tegn.")
    .refine((v) => !v.includes("@"), "Brukernavn må være uten @stud.ntnu.no"),
  password: z.string().min(8, "Passordet må være minst 8 tegn."),
  study: z.enum(REGISTRATION_STUDY_SLUGS, {
    errorMap: () => ({ message: "Velg hvilken linje du går på." }),
  }),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error?.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Ugyldig skjema.", field: first?.path[0] },
      { status: 400 },
    );
  }

  const { full_name, email, user_id: userId, password, study } = parsed.data;
  const studieretning = studyLabelForSlug(study);

  // This route creates real TIHLDE accounts, so an unthrottled one is an open
  // account-creation proxy for tihlde.org running under our IP. Checked before
  // we call Photon, so a blocked attempt costs neither side anything.
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

  // Refuse a duplicate before anything irreversible happens, and say who they
  // already are. Registering twice is the most common way to fail here: a
  // student whose Vipps payment didn't complete comes back and signs up again.
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
    // Point at the field that actually collided. Now that the username is
    // chosen again, the two cases come apart: someone re-registering under a
    // new username owns the address, while someone picking a taken username
    // may be a different person entirely.
    const sameUsername = clash.tihldeUserId === userId;
    return NextResponse.json(
      {
        error: sameUsername
          ? `Brukernavnet «${userId}» er allerede registrert. Logg inn i stedet.`
          : `E-postadressen er allerede registrert som «${clash.tihldeUserId}». Logg inn i stedet.`,
        field: sameUsername ? "user_id" : "email",
        existingUserId: clash.tihldeUserId,
      },
      { status: 409 },
    );
  }

  try {
    // Our row first, because it is the one we can undo. This ordering is the
    // fix for an earlier incident: with the TIHLDE account created first, a
    // failing local insert left orphaned accounts nobody could clean up.
    const user = await db.user.create({
      data: {
        tihldeUserId: userId,
        name: full_name,
        email,
        studieretning,
        // The bridge into the app until TIHLDE takes over. Hashed with scrypt;
        // the plaintext is never stored or logged.
        passwordHash: await hashPassword(password),
        isVerified: false,
        hasPaid: false,
        isAdmin: false,
      },
    });

    try {
      await photonCreateUser({
        name: full_name,
        email,
        password,
        studyProgramSlug: study,
        username: userId,
      });
    } catch (err) {
      await db.user
        .delete({ where: { id: user.id } })
        .catch((cleanupErr) =>
          console.error("[auth/register] rollback failed", cleanupErr),
        );
      throw err;
    }

    // Our own session (no Photon token — nobody has signed in to the new
    // account yet) so they go straight on to paying.
    const { token: sessionToken, expiresAt } = await createSession({
      userId: user.id,
      photonAccessToken: null,
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
    // Photon could not be reached at all. Its own message says so, and the
    // advice is "wait", not "check the form" — so it keeps a 503 and a
    // Retry-After rather than being folded into the case below.
    if (err instanceof PhotonUnavailableError) {
      console.error("[auth/register] photon unreachable", err.cause);
      return NextResponse.json(
        { error: err.message },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }

    if (err instanceof PhotonAuthError) {
      /**
       * A 5xx from Photon is never something to repeat to the student.
       *
       * Photon answers an unhandled error with the literal string "Internal
       * server error", and this route used to forward it verbatim — which is
       * what a new student on Digital transformasjon met on 2026-08-07: an
       * English server message on a Norwegian form, with no idea what to do
       * next.
       *
       * The overwhelmingly likely cause is that they already have a TIHLDE
       * account. Photon derives the username from the e-mail, and creating an
       * account whose username is taken but whose address is not hits the
       * unique index on `user.username` unguarded — Photon's own duplicate
       * check only ever sees the address. That is exactly the shape of an
       * account made with Feide on tihlde.org, where the address Feide reports
       * is usually not `<ntnu-brukernavn>@stud.ntnu.no`. Logging in is the only
       * thing that helps them, so we offer that instead of a raw 500, and hedge
       * it as a question because the same status also covers a genuine Photon
       * fault.
       */
      if (err.status >= 500) {
        console.error(
          "[auth/register] photon 5xx",
          err.status,
          err.message,
          userId,
        );
        return NextResponse.json(
          {
            error:
              "Vi fikk ikke opprettet TIHLDE-brukeren din. Har du allerede en bruker på tihlde.org — for eksempel laget med Feide? Da må du logge inn i stedet for å registrere deg. Hjelper ikke det, si fra til en fadder.",
            // Lights up the "Logg inn med TIHLDE"-link on the form; the
            // username is the one Photon would have given them anyway.
            existingUserId: userId,
          },
          { status: 502 },
        );
      }

      // Anything else is something the student can act on, and Photon's message
      // already says what.
      const field = /e-?post|adresse/i.test(err.message)
        ? "email"
        : /passord/i.test(err.message)
          ? "password"
          : undefined;
      return NextResponse.json({ error: err.message, field }, { status: 400 });
    }

    if (isUniqueConstraintError(err)) {
      return NextResponse.json(
        {
          error: "Du er allerede registrert. Logg inn med TIHLDE i stedet.",
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
