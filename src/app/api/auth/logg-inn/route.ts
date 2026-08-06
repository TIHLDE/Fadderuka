import { NextResponse } from "next/server";

import { REGISTRATION_STUDY_SLUGS } from "~/lib/majors";
import { PhotonAuthError, startLogin } from "~/server/auth/photon";
import { safeReturnTo, storeLoginAttempt } from "~/server/auth/oauth-state";

/**
 * Start "Logg inn med TIHLDE": mint a PKCE pair and send the student to Photon.
 *
 * A GET rather than a POST because it is reached from a plain link — there is
 * nothing to submit, and no state on our side to change until they come back.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));

  // Only a slug we actually offer. Anything else is dropped rather than
  // rejected: it decides what the student pays, so an unrecognised value must
  // never become a stored `studieretningOverride`.
  const rawStudy = url.searchParams.get("study");
  const declaredStudy = (
    REGISTRATION_STUDY_SLUGS as readonly string[]
  ).includes(rawStudy ?? "")
    ? rawStudy
    : null;

  try {
    const { url: authorizeUrl, state, codeVerifier } = startLogin({});
    await storeLoginAttempt({ state, codeVerifier, returnTo, declaredStudy });
    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    if (err instanceof PhotonAuthError) {
      console.error("[auth/logg-inn]", err.message);
      return NextResponse.redirect(
        new URL(
          `/logg-inn?error=${encodeURIComponent(err.message)}`,
          url.origin,
        ),
      );
    }
    throw err;
  }
}
