import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { studyLabelForSlug } from "~/lib/majors";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSession,
} from "~/server/auth/config";
import { clearLoginAttempt, readLoginAttempt } from "~/server/auth/oauth-state";
import {
  PhotonAuthError,
  exchangeCode,
  fetchProfile,
  isMemberOfAnyGroup,
} from "~/server/auth/photon";
import { db } from "~/server/db";
import { deriveIsFadder } from "~/server/fadder";

/**
 * Where "Logg inn med TIHLDE" comes back to.
 *
 * Carries over every decision the old password-proxy login made — admin status,
 * the fadder rule, the "nytt studium" declaration — with Photon as the source
 * instead of Lepton. What is gone is the credential handling: no password
 * passes through this app any more, and no TIHLDE account token is stored.
 */

/**
 * TIHLDE groups whose members are always app admins: FadderKom runs Fadderuka,
 * and Index drifter appen. Membership in any *other* committee grants nothing.
 */
const ADMIN_GROUP_SLUGS = ["fadderkom", "index"];

function failure(origin: string, message: string) {
  return NextResponse.redirect(
    new URL(`/logg-inn?error=${encodeURIComponent(message)}`, origin),
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const attempt = await readLoginAttempt();
  // Single use, whatever happens next — a verifier that outlives its attempt is
  // a replayable credential.
  await clearLoginAttempt();

  const error = url.searchParams.get("error");
  if (error) {
    // The student pressed "avbryt" on Photon's consent screen, or Photon
    // refused the request. Neither is worth an error page.
    if (error === "access_denied") {
      return NextResponse.redirect(new URL("/logg-inn", origin));
    }
    console.error("[auth/callback] photon returned", error);
    return failure(origin, "TIHLDE avbrøt innloggingen. Prøv på nytt.");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return failure(origin, "Innloggingen mangler informasjon. Prøv på nytt.");
  }

  /**
   * The state must match the cookie we set before the redirect. Without this
   * check, anyone could feed a logged-in student a callback URL holding *their*
   * authorization code and silently sign the student into the attacker's
   * account.
   */
  if (!attempt.state || !attempt.codeVerifier || state !== attempt.state) {
    return failure(
      origin,
      "Innloggingen tok for lang tid eller ble avbrutt. Prøv på nytt.",
    );
  }

  try {
    const tokens = await exchangeCode(code, attempt.codeVerifier);
    const { sub, email, name, picture, preferred_username } =
      tokens.idTokenClaims;

    const profile = await fetchProfile(tokens.accessToken, sub);

    /**
     * The TIHLDE username is the key every row in this app is stored under, and
     * it is what the 220 accounts created before this cutover already hold. An
     * account without one cannot be matched to them, so it is better to stop
     * here than to create a duplicate under some fallback key.
     */
    const tihldeUserId = (
      profile.username ??
      preferred_username ??
      ""
    ).toLowerCase();
    if (!tihldeUserId) {
      console.error("[auth/callback] no username for photon user", sub);
      return failure(
        origin,
        "TIHLDE-brukeren din mangler brukernavn. Si fra til en fadder.",
      );
    }

    const existing = await db.user.findUnique({
      where: { tihldeUserId },
      select: {
        adminOverride: true,
        fadderOverride: true,
        studieretningOverride: true,
        isFadder: true,
        hasPaid: true,
        memberships: { where: { role: "FADDER" }, select: { id: true } },
      },
    });

    /**
     * A manual decision in the admin panel (`adminOverride`) always wins and
     * survives every login; otherwise it is derived live from group membership.
     * Deliberately NOT based on TIHLDE write permissions: those are handed to
     * every committee member, which once made anyone holding any verv an admin
     * of this app.
     */
    const isAdmin =
      existing?.adminOverride ?? isMemberOfAnyGroup(profile, ADMIN_GROUP_SLUGS);

    const hasFadderMembership = (existing?.memberships.length ?? 0) > 0;

    /**
     * The "nytt studium i høst" declaration, chosen before the redirect. Refused
     * for anyone holding a FADDER role in a faddergruppe: they demonstrably are
     * a fadder, and a mis-click should not hand them a payment prompt. It only
     * ever moves someone onto the PAYING side, so it is not worth abusing.
     */
    const declaredStudy =
      attempt.declaredStudy && !hasFadderMembership
        ? studyLabelForSlug(attempt.declaredStudy)
        : null;

    // Photon reports the cohort as a number; `deriveIsFadder` reads the Lepton
    // STUDYYEAR group name, which was that same year as a string.
    const klasse =
      profile.studyStartYear === null ? null : String(profile.studyStartYear);

    const isFadder = deriveIsFadder({
      fadderOverride: declaredStudy ? false : existing?.fadderOverride,
      klasse,
      hasPaid: existing?.hasPaid === true,
      hasFadderMembership,
    });

    const studieretning =
      declaredStudy ??
      existing?.studieretningOverride ??
      profile.studyProgram ??
      null;

    // Exempt users get access outright; everyone else keeps whatever
    // verification they earned by paying. The one case where access is taken
    // away is a user auto-exempted as a fadder who has now told us they are a
    // fadderbarn — that access came from the exemption, so it leaves with it,
    // unless real money has already changed hands.
    const isExempt = isFadder || isAdmin;
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

    const user = await db.user.upsert({
      where: { tihldeUserId },
      create: {
        tihldeUserId,
        name: name ?? tihldeUserId,
        email: email ?? "",
        image: picture,
        studieretning,
        klasse,
        isAdmin,
        isFadder,
        ...studyGrant,
        ...accessGrant,
      },
      update: {
        // Payment flags for non-exempt users are earned via Vipps and owned by
        // us, so they are deliberately absent here.
        name: name ?? undefined,
        email: email ?? undefined,
        image: picture,
        studieretning,
        klasse,
        isAdmin,
        isFadder,
        ...studyGrant,
        ...accessGrant,
      },
    });

    const hdrs = await headers();
    const { token: sessionToken, expiresAt } = await createSession({
      userId: user.id,
      photonAccessToken: tokens.accessToken,
      ipAddress: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: hdrs.get("user-agent"),
    });

    const store = await cookies();
    store.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
      expires: expiresAt,
    });

    return NextResponse.redirect(new URL(attempt.returnTo, origin));
  } catch (err) {
    if (err instanceof PhotonAuthError) {
      console.error("[auth/callback]", err.status, err.message);
      return failure(origin, err.message);
    }
    console.error("[auth/callback] unexpected error", err);
    return failure(
      origin,
      "Noe gikk galt hos oss under innloggingen. Prøv igjen — går det ikke, si fra til en fadder.",
    );
  }
}
