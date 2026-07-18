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
import { TihldeAuthError, tihldeCreateUser } from "~/server/auth/tihlde";
import { db } from "~/server/db";

/**
 * Self-registration for brand-new students during fadderuka.
 *
 * Creates a REAL (but pending-approval) TIHLDE account via Lepton's public
 * `POST /users/`, mirrors it into our local user table, and mints our own
 * session so the user gets straight into the app. Payment (Vipps) is handled
 * separately by the client after this succeeds. The password is forwarded to
 * TIHLDE and never stored or logged here.
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
  allergies: z.string().trim().max(500).optional(),
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

  const { full_name, email, user_id, password, study, allergies } = parsed.data;
  const userId = user_id.toLowerCase();
  const { first, last } = splitName(full_name);
  const studieretning = studyLabelForSlug(study);
  const allergiesValue = allergies && allergies.length > 0 ? allergies : null;

  try {
    // 1. Create the real TIHLDE account (pending admin approval). class:null —
    //    the study membership is enough; the year group may not exist yet.
    await tihldeCreateUser({
      user_id: userId,
      password,
      first_name: first,
      last_name: last,
      email,
      study,
      class: null,
    });

    // 2. Mirror into our local user table, keyed by the TIHLDE user_id. Payment
    //    flags are ours (earned via Vipps) and start false.
    const user = await db.user.upsert({
      where: { tihldeUserId: userId },
      create: {
        tihldeUserId: userId,
        name: full_name,
        email,
        studieretning,
        allergies: allergiesValue,
        isVerified: false,
        hasPaid: false,
        isAdmin: false,
      },
      update: {
        name: full_name,
        email,
        studieretning,
        allergies: allergiesValue,
      },
    });

    // 3. Mint our own session (no TIHLDE token — the account isn't activated
    //    yet) and set the httpOnly cookie so they're logged into the app.
    const hdrs = await headers();
    const { token: sessionToken, expiresAt } = await createSession({
      userId: user.id,
      tihldeToken: null,
      ipAddress: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
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
    console.error("[auth/register] unexpected error", err);
    return NextResponse.json(
      { error: "Noe gikk galt ved registreringen." },
      { status: 500 },
    );
  }
}
