import "server-only";

import { cookies } from "next/headers";

/**
 * The one-shot cookies that carry a login attempt from `/api/auth/logg-inn` to
 * `/api/auth/callback`: the PKCE verifier, the CSRF state, and where to send
 * the student afterwards.
 *
 * Cookies rather than a table because each pair lives for exactly one redirect.
 * A row per abandoned login is a row nobody would ever delete, and the browser
 * expires these for us.
 */

const STATE_COOKIE = "fadderuke.oauth_state";
const VERIFIER_COOKIE = "fadderuke.oauth_verifier";
const RETURN_COOKIE = "fadderuke.oauth_return";
/**
 * "Jeg begynner på et nytt studium i høst", chosen before the redirect.
 *
 * It has to survive the trip to Photon and back, because it is the one fact
 * their profile cannot tell us: someone starting Digital transformasjon after a
 * bachelor keeps the old programme and the old cohort there, which reads as
 * "2. klasse or later" — a fadder, exempt from paying — when they are in fact a
 * first-year fadderbarn.
 */
const STUDY_COOKIE = "fadderuke.oauth_study";

/** Long enough to log in and pick an account, short enough to be one attempt. */
const MAX_AGE = 60 * 15;

const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // Photon redirects the browser back with a top-level GET, which a strict
  // cookie would not be sent on — the callback would then look like a forged
  // request to itself.
  sameSite: "lax",
  path: "/",
  maxAge: MAX_AGE,
} as const;

export async function storeLoginAttempt(opts: {
  state: string;
  codeVerifier: string;
  returnTo: string;
  declaredStudy?: string | null;
}): Promise<void> {
  const store = await cookies();
  store.set(STATE_COOKIE, opts.state, options);
  store.set(VERIFIER_COOKIE, opts.codeVerifier, options);
  store.set(RETURN_COOKIE, opts.returnTo, options);
  if (opts.declaredStudy) {
    store.set(STUDY_COOKIE, opts.declaredStudy, options);
  } else {
    store.delete(STUDY_COOKIE);
  }
}

export async function readLoginAttempt(): Promise<{
  state: string | null;
  codeVerifier: string | null;
  returnTo: string;
  declaredStudy: string | null;
}> {
  const store = await cookies();
  return {
    state: store.get(STATE_COOKIE)?.value ?? null,
    codeVerifier: store.get(VERIFIER_COOKIE)?.value ?? null,
    returnTo: safeReturnTo(store.get(RETURN_COOKIE)?.value),
    declaredStudy: store.get(STUDY_COOKIE)?.value ?? null,
  };
}

/** Clear the attempt, whether it succeeded or not. Single use, either way. */
export async function clearLoginAttempt(): Promise<void> {
  const store = await cookies();
  store.delete(STATE_COOKIE);
  store.delete(VERIFIER_COOKIE);
  store.delete(RETURN_COOKIE);
  store.delete(STUDY_COOKIE);
}

/**
 * Only same-site paths are followed after login.
 *
 * `returnTo` reaches us from a query parameter, so an absolute URL here would
 * turn the login into an open redirect: a link to our own login page that lands
 * the student on someone else's site, already trusting it because they got
 * there by logging into TIHLDE. A leading `//` is rejected for the same reason
 * — the browser reads it as protocol-relative and leaves the site.
 */
export function safeReturnTo(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
