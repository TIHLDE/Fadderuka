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
import { isOnFadderList } from "~/server/fadder-liste";

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

    const selectExisting = {
      id: true,
      tihldeUserId: true,
      adminOverride: true,
      fadderOverride: true,
      studieretningOverride: true,
      isFadder: true,
      hasPaid: true,
      memberships: { where: { role: "FADDER" as const }, select: { id: true } },
    };

    /**
     * The username is the key, and for almost everyone it matches outright.
     *
     * The exception is a student who self-registered here and typed something
     * other than their real NTNU username — the form asks for the Feide one,
     * but nothing can enforce it. Their row holds a payment and possibly a
     * fadder exemption, and creating a second row under the real username would
     * silently orphan both: to an admin reading the payment overview they would
     * look like someone who never paid.
     *
     * So fall back to the address before giving up. A hit means this is the
     * same person arriving under the name TIHLDE knows them by, and the row is
     * adopted — `tihldeUserId` is rewritten to the real username below, which
     * also stops the fallback from being needed a second time.
     */
    let existing = await db.user.findUnique({
      where: { tihldeUserId },
      select: selectExisting,
    });

    if (!existing && email) {
      existing = await db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: selectExisting,
      });
      if (existing) {
        console.info(
          `[auth/callback] adopting ${existing.tihldeUserId} as ${tihldeUserId} (matched on e-mail)`,
        );
      }
    }

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

    /**
     * FadderKom's sign-up list — the path that makes a fadder exempt on her
     * very first login, before any admin has touched her and regardless of
     * what her cohort says.
     *
     * Consulted only when nothing else has already decided: a pinned
     * `fadderOverride` is an admin's explicit call and outranks a spreadsheet,
     * and a "nytt studium i høst" declaration means she has just told us she
     * is a fadderbarn. Skipping the query in those cases is also why a
     * returning fadder costs no extra round-trip — the pin from her first
     * login is what answers on every login after it.
     */
    const listedAsFadder =
      existing?.fadderOverride == null && !declaredStudy
        ? await isOnFadderList({
            name: name ?? null,
            email: email ?? null,
            studieretning: profile.studyProgram ?? null,
            klasse,
          })
        : false;

    const isFadder = deriveIsFadder({
      fadderOverride: declaredStudy
        ? false
        : listedAsFadder || existing?.fadderOverride,
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

    // Pin the list's verdict. Without this the lookup would repeat on every
    // login, and — worse — a fadder later un-flagged by an admin would be
    // silently re-exempted the next time she signed in.
    const listGrant = listedAsFadder ? { fadderOverride: true } : {};

    // Keyed on the row we resolved above rather than on `tihldeUserId`, since
    // an adopted row is still stored under the username the student typed.
    const user = existing
      ? await db.user.update({
          where: { id: existing.id },
          data: {
            // Payment flags for non-exempt users are earned via Vipps and owned
            // by us, so they are deliberately absent here.
            tihldeUserId,
            name: name ?? undefined,
            email: email ?? undefined,
            image: picture,
            studieretning,
            klasse,
            isAdmin,
            isFadder,
            // The handover. A local password exists only to bridge the gap
            // until TIHLDE will answer for this account, and TIHLDE just did —
            // so the bridge comes down rather than living on as a second,
            // weaker way in.
            passwordHash: null,
            ...listGrant,
            ...studyGrant,
            ...accessGrant,
          },
        })
      : await db.user.create({
          data: {
            tihldeUserId,
            name: name ?? tihldeUserId,
            email: email ?? "",
            image: picture,
            studieretning,
            klasse,
            isAdmin,
            isFadder,
            ...listGrant,
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
