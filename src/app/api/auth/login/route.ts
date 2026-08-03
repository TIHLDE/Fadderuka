import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { REGISTRATION_STUDY_SLUGS, studyLabelForSlug } from "~/lib/majors";
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
import { deriveIsFadder } from "~/server/fadder";
import {
  TihldeAuthError,
  TihldeUnavailableError,
  isMemberOfAnyGroup,
  mapProfile,
  tihldeGetMe,
  tihldeGetMemberships,
  tihldeLogin,
} from "~/server/auth/tihlde";

/**
 * TIHLDE groups whose members are always app admins: FadderKom runs Fadderuka,
 * and Index drifter appen. Membership in any *other* committee grants nothing.
 */
const ADMIN_GROUP_SLUGS = ["fadderkom", "index"];

const bodySchema = z.object({
  user_id: z.string().min(1, "Brukernavn er påkrevd."),
  password: z.string().min(1, "Passord er påkrevd."),
  /**
   * Optional: the programme the user is STARTING this autumn, when it isn't the
   * one their TIHLDE profile shows. Sent from the "nytt studium i år" option on
   * the login page — see the handling in step 3.
   */
  study: z.enum(REGISTRATION_STUDY_SLUGS).optional(),
});

/** The caller's IP, taken from the first hop in x-forwarded-for. */
async function clientIp(): Promise<string | null> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/** Mint our own session for `userId` and set the httpOnly cookie. */
async function issueSession(userId: string, tihldeToken: string | null) {
  const hdrs = await headers();
  const { token: sessionToken, expiresAt } = await createSession({
    userId,
    tihldeToken,
    ipAddress: await clientIp(),
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
}

/**
 * Fallback for self-registered users whose TIHLDE account is still pending
 * approval: Lepton rejects their login, but they already have a local account
 * (and possibly a paid Vipps order), so we accept the password hash we stored
 * during registration. Returns null when there is no local password to match,
 * in which case the caller surfaces TIHLDE's original error.
 */
async function tryLocalLogin(userId: string, password: string) {
  const user = await db.user.findUnique({
    where: { tihldeUserId: userId.toLowerCase() },
  });
  if (!user?.passwordHash) return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;

  await issueSession(user.id, null);
  return NextResponse.json({ ok: true, verified: user.isVerified });
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Fyll inn brukernavn og passord." },
      { status: 400 },
    );
  }

  const ip = await clientIp();

  // 0. Spend-the-budget check before anything else, so a blocked attempt costs
  //    neither us nor TIHLDE a round trip. The message is the same whether or
  //    not the username exists — otherwise this would answer that question.
  const limit = await checkLoginRateLimit(parsed.data.user_id, ip);
  if (limit.blocked) {
    return NextResponse.json(
      {
        error: `For mange innloggingsforsøk. Prøv igjen om ${limit.retryAfterMinutes} minutter.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterMinutes * 60) } },
    );
  }

  try {
    // 1. Validate credentials against TIHLDE and fetch the profile.
    const token = await tihldeLogin(parsed.data.user_id, parsed.data.password);
    const profile = await tihldeGetMe(token);
    const mapped = mapProfile(profile);

    // 2. Decide admin status. A manual decision in the admin panel
    //    (`adminOverride`) always wins and survives every login; otherwise we
    //    derive it live from TIHLDE, where the sole criterion is membership in
    //    one of the committees that run the app. Deliberately NOT based on
    //    TIHLDE write permissions: those are handed out to every committee
    //    member, which made anyone holding any verv an admin of this app.
    //
    //    Admins run the app rather than attend as fadderbarn, so being one is
    //    an exemption from payment. Note it grants access (`isVerified`) but
    //    never `hasPaid`: that field means "money actually changed hands", and
    //    faking it here is what previously left demoted admins looking paid
    //    forever. A fetch failure must not block login — and must not silently
    //    revoke an existing admin — so on error we leave the flag untouched.
    const existing = await db.user.findUnique({
      where: { tihldeUserId: mapped.tihldeUserId },
      select: {
        adminOverride: true,
        fadderOverride: true,
        studieretningOverride: true,
        isFadder: true,
        hasPaid: true,
        memberships: { where: { role: "FADDER" }, select: { id: true } },
      },
    });

    let adminGrant: { isAdmin?: boolean } = {};
    if (existing?.adminOverride != null) {
      adminGrant = { isAdmin: existing.adminOverride };
    } else {
      try {
        const memberships = await tihldeGetMemberships(token, profile.user_id);
        adminGrant = {
          isAdmin: isMemberOfAnyGroup(memberships, ADMIN_GROUP_SLUGS),
        };
      } catch (err) {
        console.error("[auth/login] admin derivation failed", err);
      }
    }

    const hasFadderMembership = (existing?.memberships.length ?? 0) > 0;

    // 3. Handle a user who is starting a NEW programme this autumn.
    //
    //    Digital transformasjon is the reason this exists: it is a 2-year
    //    continuation of a 3-year bachelor, so nearly everyone starting it
    //    already has a TIHLDE account from their bachelor — and tihlde.org
    //    keeps them in the OLD study group and the OLD cohort. Read literally,
    //    that profile says "admitted in 2023", which the cohort rule below
    //    correctly reads as "2. klasse or later" and therefore a fadder. They
    //    are in fact in their 4th year of study but their 1st year on DT: a
    //    fadderbarn, who should pay and be placed in a faddergruppe.
    //
    //    Nothing in the profile distinguishes DT year 1 from DT year 2, so the
    //    user tells us, and we pin both facts the way the admin panel pins its
    //    decisions — they must survive every later login, or the next one would
    //    silently restore the bachelor and the exemption.
    //
    //    A declaration only ever moves someone onto the PAYING side, so it is
    //    not worth abusing. It is still refused for anyone holding a FADDER
    //    role in a faddergruppe: they demonstrably are a fadder, and a
    //    mis-click should not hand them a payment prompt.
    const declaredStudy =
      parsed.data.study && !hasFadderMembership
        ? studyLabelForSlug(parsed.data.study)
        : null;

    // 4. Decide whether this user owes anything at all. Only fadderbarn pay,
    //    and a fadder is by definition in 2. klasse or higher — so the study
    //    cohort we just read from TIHLDE settles it without anyone having to
    //    be assigned to a group first. That is what keeps a fadder from ever
    //    seeing a payment prompt, including on their very first login.
    const isFadder = deriveIsFadder({
      fadderOverride: declaredStudy ? false : existing?.fadderOverride,
      klasse: mapped.klasse,
      hasFadderMembership,
    });

    // The programme we show and group by: a declaration wins, then any earlier
    // declaration, and otherwise TIHLDE owns the field as before.
    const studieretning =
      declaredStudy ?? existing?.studieretningOverride ?? mapped.studieretning;

    // Exempt users get access outright; everyone else keeps whatever
    // verification they have earned by paying. The one case where access is
    // taken away is a user who was auto-exempted as a fadder and has now told
    // us they are a fadderbarn — that access came from the exemption, so it
    // leaves with it, unless real money has already changed hands.
    const isExempt = isFadder || adminGrant.isAdmin === true;
    const losesStaleExemption =
      declaredStudy !== null &&
      existing?.isFadder === true &&
      existing.hasPaid !== true;

    const accessGrant = isExempt
      ? { isVerified: true }
      : losesStaleExemption
        ? { isVerified: false }
        : {};

    const studyGrant = declaredStudy
      ? { studieretningOverride: declaredStudy, fadderOverride: false }
      : {};

    // 5. Upsert the local user, keyed by TIHLDE user_id. Payment flags for
    //    non-exempt users are owned by us (earned via Vipps) and left
    //    untouched. TIHLDE now authenticates this account, so the local
    //    registration password hash has served its purpose and is dropped.
    const user = await db.user.upsert({
      where: { tihldeUserId: mapped.tihldeUserId },
      create: {
        ...mapped,
        studieretning,
        ...studyGrant,
        ...adminGrant,
        ...accessGrant,
        isFadder,
      },
      update: {
        name: mapped.name,
        email: mapped.email,
        image: mapped.image,
        studieretning,
        klasse: mapped.klasse,
        passwordHash: null,
        passwordIsTemporary: false,
        isFadder,
        ...studyGrant,
        ...adminGrant,
        ...accessGrant,
      },
    });

    // 6. Mint our own session and set the httpOnly cookie. Proving they know
    //    the password also clears whatever failures came before.
    await issueSession(user.id, token);
    await clearLoginFailures(parsed.data.user_id, ip);

    // `verified` lets the registration page skip straight to the app for users
    // who don't owe a payment (admins are auto-verified above).
    return NextResponse.json({ ok: true, verified: user.isVerified });
  } catch (err) {
    // TIHLDE unreachable. A self-registered student may still have a local
    // password, so try that before giving up — it is exactly the situation the
    // local hash exists for, and it keeps people in the app during an outage.
    if (err instanceof TihldeUnavailableError) {
      console.error("[auth/login] TIHLDE unreachable", err.cause);

      const local = await tryLocalLogin(
        parsed.data.user_id,
        parsed.data.password,
      );
      if (local) {
        await clearLoginFailures(parsed.data.user_id, ip);
        return local;
      }

      return NextResponse.json(
        { error: err.message },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }

    if (err instanceof TihldeAuthError) {
      // 401/403 from TIHLDE → the account may simply not be approved on
      // tihlde.org yet, so try the local registration password first.
      if (err.status === 401 || err.status === 403) {
        const local = await tryLocalLogin(
          parsed.data.user_id,
          parsed.data.password,
        );
        if (local) {
          await clearLoginFailures(parsed.data.user_id, ip);
          return local;
        }
        // Wrong on both counts — this is the attempt worth counting.
        await recordFailedLogin(parsed.data.user_id, ip);
        return NextResponse.json({ error: err.message }, { status: 401 });
      }
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[auth/login] unexpected error", err);
    return NextResponse.json(
      {
        error:
          "Noe gikk galt hos oss under innloggingen. Prøv igjen — går det ikke, si fra til en fadder.",
      },
      { status: 500 },
    );
  }
}
