import "server-only";

import { createHash, randomBytes } from "crypto";

import { env } from "~/env";

/**
 * OIDC client for Photon, TIHLDE's identity provider.
 *
 * Replaces the Lepton password proxy this app used to run. That proxy took the
 * student's TIHLDE password in clear text, forwarded it to `POST /auth/login/`
 * and kept the returned API token — a full account credential — for as long as
 * the session lived. It also stopped working for anyone who made their account
 * on tihlde.org after the Photon migration, because Lepton no longer knows
 * those people: they were told "Du må aktiveres som TIHLDE-medlem", with no way
 * to be activated.
 *
 * Here the password is only ever typed on tihlde.org, and what comes back is a
 * scoped, short-lived access token plus an id token we verify. Authorization
 * code + PKCE, per the metadata at
 * `https://photon.tihlde.org/.well-known/openid-configuration`.
 */

const SCOPES = "openid profile email";

/**
 * The audience we request tokens for — Photon's auth base URL, which is the
 * only value its provider accepts. See the note in `exchangeCode`.
 *
 * A function, not a constant: with `SKIP_ENV_VALIDATION` set — which is how CI
 * runs `next build` — `env` is raw `process.env`, so the zod default for
 * `PHOTON_API_URL` never applies. Reading it while the module loaded therefore
 * threw `Cannot read properties of undefined` and failed the build on every
 * machine without that variable set. Nothing else here touches `env` before it
 * is called.
 */
const photonAudience = () => endpoint("/api/auth");

/** How long we wait for Photon before giving up on a request. */
const TIMEOUT_MS = 10_000;

/** Raised when Photon answers, but not with what we asked for. */
export class PhotonAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PhotonAuthError";
  }
}

/**
 * Raised when Photon could not be reached at all — timeout, DNS, TLS.
 *
 * Kept distinct from `PhotonAuthError` for the same reason the Lepton client
 * did: the advice is the opposite of "check what you typed", and a student who
 * reads "noe gikk galt" assumes they made the mistake.
 */
export class PhotonUnavailableError extends PhotonAuthError {
  constructor(readonly cause?: unknown) {
    super(
      "Får ikke kontakt med TIHLDE akkurat nå. Vent litt og prøv igjen — det er ikke noe galt med det du gjorde.",
      503,
    );
    this.name = "PhotonUnavailableError";
  }
}

async function photonFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new PhotonUnavailableError(err);
  }
}

const endpoint = (path: string) =>
  `${env.PHOTON_API_URL.replace(/\/$/, "")}${path}`;

/** Where Photon sends the student back to. Must match the registered client. */
export function redirectUri(): string {
  const base = env.APP_URL?.replace(/\/$/, "");
  if (!base) {
    throw new PhotonAuthError(
      "APP_URL er ikke satt, så vi vet ikke hvor TIHLDE skal sende deg tilbake.",
      500,
    );
  }
  return `${base}/api/auth/callback`;
}

export interface LoginStart {
  url: string;
  state: string;
  codeVerifier: string;
}

/**
 * Build the authorization URL, with a fresh PKCE pair and state.
 *
 * The verifier and state go into short-lived cookies rather than a table: they
 * are single-use, live for one redirect, and a row per abandoned login attempt
 * is a table nobody would ever clean up.
 */
export function startLogin(opts: { prompt?: "login" | "create" }): LoginStart {
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(64).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const url = new URL(endpoint("/api/auth/oauth2/authorize"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", requireClientId());
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (opts.prompt) url.searchParams.set("prompt", opts.prompt);

  return { url: url.toString(), state, codeVerifier };
}

function requireClientId(): string {
  const id = env.PHOTON_OAUTH_CLIENT_ID;
  if (!id) {
    throw new PhotonAuthError(
      "PHOTON_OAUTH_CLIENT_ID er ikke satt — innlogging er ikke satt opp.",
      500,
    );
  }
  return id;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  /** Seconds until the access token expires, as Photon reported it. */
  expiresIn: number | null;
  idTokenClaims: IdTokenClaims;
}

export interface IdTokenClaims {
  sub: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  /** The TIHLDE username — our join key. See Photon's `preferredUsernameClaim`. */
  preferred_username: string | null;
}

/**
 * Read the id token's payload.
 *
 * Not verified here, and deliberately so: the token came back over TLS on a
 * direct back-channel call to Photon's token endpoint, in response to a code
 * only we could redeem, so there is no third party in a position to have
 * substituted it. Verifying an EdDSA signature against the JWKS would add a key
 * fetch per login to re-prove what the transport already proves. Everything
 * that matters for authorization is re-read from Photon's API afterwards.
 */
function readIdToken(idToken: string): IdTokenClaims {
  const payload = idToken.split(".")[1];
  if (!payload) {
    throw new PhotonAuthError("Fikk et ugyldig id-token fra TIHLDE.", 502);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
  } catch {
    throw new PhotonAuthError("Fikk et ugyldig id-token fra TIHLDE.", 502);
  }

  const str = (v: unknown): string | null =>
    typeof v === "string" && v.length > 0 ? v : null;

  const sub = str(parsed.sub);
  if (!sub) {
    throw new PhotonAuthError("Id-tokenet fra TIHLDE manglet bruker.", 502);
  }

  return {
    sub,
    email: str(parsed.email),
    name: str(parsed.name),
    picture: str(parsed.picture),
    preferred_username: str(parsed.preferred_username),
  };
}

/** Exchange the authorization code for tokens. */
export async function exchangeCode(
  code: string,
  codeVerifier: string,
): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    client_id: requireClientId(),
    code_verifier: codeVerifier,
    /**
     * Asks for an access token we can actually use against Photon's API.
     *
     * Without `resource` the provider mints an OPAQUE token (`tihlde_oat_…`),
     * and Photon's own `requireAuth` only understands JWTs — it bails on
     * `token.split(".").length !== 3` and answers 401. Every profile lookup
     * then failed with "Kunne ikke hente profilen din fra TIHLDE", which is
     * what took the login down on the night of the cutover.
     *
     * The value has to be Photon's auth base URL: `validAudiences` is not
     * configured on the provider, so it defaults to exactly that one origin and
     * rejects anything else with `requested resource invalid`.
     */
    resource: photonAudience(),
  });

  const secret = env.PHOTON_OAUTH_CLIENT_SECRET;
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (secret) {
    headers.Authorization = `Basic ${Buffer.from(
      `${requireClientId()}:${secret}`,
    ).toString("base64")}`;
  }

  const res = await photonFetch(endpoint("/api/auth/oauth2/token"), {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("[photon] token exchange failed", res.status, detail);
    throw new PhotonAuthError(
      "TIHLDE godtok ikke innloggingen. Prøv på nytt.",
      res.status,
    );
  }

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    id_token?: string;
  };

  if (!data.access_token || !data.id_token) {
    throw new PhotonAuthError("Fikk ikke tokens fra TIHLDE.", 502);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : null,
    idTokenClaims: readIdToken(data.id_token),
  };
}

/** The parts of Photon's `GET /api/user/:id` this app acts on. */
export interface PhotonProfile {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  studyProgram: string | null;
  studyStartYear: number | null;
  groups: { slug: string; role: string }[];
}

/**
 * The member's profile, read with their own access token.
 *
 * This — not the id token — is where study programme, cohort and group
 * memberships come from, because those decide who pays and who is an admin, and
 * they must be the live values rather than whatever was true when a token was
 * minted.
 */
export async function fetchProfile(
  accessToken: string,
  userId: string,
): Promise<PhotonProfile> {
  const res = await photonFetch(
    endpoint(`/api/user/${encodeURIComponent(userId)}`),
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    throw new PhotonAuthError(
      "Kunne ikke hente profilen din fra TIHLDE.",
      res.status,
    );
  }

  return (await res.json()) as PhotonProfile;
}

/** Does the member hold a role in any of `slugs`? Drives admin status. */
export function isMemberOfAnyGroup(
  profile: PhotonProfile,
  slugs: string[],
): boolean {
  const wanted = new Set(slugs.map((s) => s.toLowerCase()));
  return profile.groups.some((g) => wanted.has(g.slug.toLowerCase()));
}

/**
 * Create a TIHLDE account from this app's own sign-up form.
 *
 * Replaces `tihldeCreateUser`, which created the account in Lepton. Those
 * accounts were born pending approval, and after the Photon migration nothing
 * could approve them — every student who registered here got an account that
 * could not log in anywhere, including here.
 *
 * Photon owns the password rules and sends the verification mail. We
 * authenticate with an API key, so this must only run on the server.
 *
 * `username` is what lets a student without an @stud.ntnu.no address register
 * at all. Photon derives the username from the address when none is given, and
 * refuses anything that is not a stud address — which locks out exactly the
 * new students this form exists for, since many have not been given their NTNU
 * address yet. Passing it explicitly is the contract Lepton had, and the form
 * asks for the Feide username, so the account they create here *is* their NTNU
 * identity: a later Feide login lands on the same account rather than a second
 * one.
 */
export async function photonCreateUser(input: {
  name: string;
  email: string;
  password: string;
  studyProgramSlug: string;
  username?: string;
}): Promise<{ id: string; username: string; email: string }> {
  const apiKey = env.PHOTON_REGISTER_API_KEY;
  if (!apiKey) {
    throw new PhotonAuthError(
      "Registrering er ikke satt opp (PHOTON_REGISTER_API_KEY mangler).",
      500,
    );
  }

  const res = await photonFetch(endpoint("/api/user/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let message = "Kunne ikke opprette TIHLDE-brukeren din.";
    try {
      const body = (await res.json()) as { message?: unknown };
      if (typeof body.message === "string") message = body.message;
    } catch {
      // Keep the fallback.
    }
    throw new PhotonAuthError(message, res.status);
  }

  return (await res.json()) as {
    id: string;
    username: string;
    email: string;
  };
}
