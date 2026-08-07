/**
 * Thin client-side auth helpers that talk to our own /api/auth routes.
 *
 * Signing in with TIHLDE is not here: it is a plain link to
 * `/api/auth/logg-inn`, which redirects to Photon. `localLogin` is the
 * exception, and only for students whose TIHLDE account is not usable yet.
 */

interface Result {
  error: string | null;
}

/** New-user self-registration payload (mirrors /api/auth/register). */
export interface RegisterInput {
  full_name: string;
  /**
   * Any address. New students often have not been given their @stud.ntnu.no
   * one when they sign up on stand.
   */
  email: string;
  /** The TIHLDE username, ideally the Feide one. Chosen, not derived. */
  user_id: string;
  password: string;
  study: string;
}

interface LocalLoginResult extends Result {
  /** Whether they already have app access, so the form can skip the paywall. */
  verified?: boolean;
  /**
   * Stable identifier for the failure, so the page can render the message with
   * a working «Glemt passord»-link instead of picking the words apart. The
   * `error` string stays the plain-text version of the same thing.
   */
  code?: string;
}

interface RegisterResult extends Result {
  /** Which form field the error belongs to, when the server could tell. */
  field?: string;
  /**
   * Set when the failure was "you already have an account": the username they
   * should log in as. Lets the form point at the login button instead of
   * leaving them to guess which field to change.
   */
  existingUserId?: string;
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body?.error ?? fallback;
  } catch {
    return fallback;
  }
}

export const authClient = {
  /** Register a brand-new TIHLDE account and log into the app. */
  async register(input: RegisterInput): Promise<RegisterResult> {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      let field: string | undefined;
      let existingUserId: string | undefined;
      // Only used if the server sent nothing parseable at all — every real
      // failure carries its own message.
      let error = "Fikk ikke svar fra serveren. Sjekk nettet og prøv igjen.";
      try {
        const body = (await res.json()) as {
          error?: string;
          field?: string;
          existingUserId?: string;
        };
        error = body?.error ?? error;
        field = body?.field;
        existingUserId = body?.existingUserId;
      } catch {
        // keep defaults
      }
      return { error, field, existingUserId };
    }
    return { error: null };
  },

  /**
   * Log in with the password chosen at registration.
   *
   * Only works while the TIHLDE account cannot be used yet — the hash is
   * dropped the first time they sign in through TIHLDE.
   */
  async localLogin(input: {
    user_id: string;
    password: string;
  }): Promise<LocalLoginResult> {
    const res = await fetch("/api/auth/lokal-innlogging", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      return {
        error:
          body.error ?? "Fikk ikke svar fra serveren. Sjekk nettet og prøv igjen.",
        code: body.code,
      };
    }

    const body = (await res.json().catch(() => ({}))) as { verified?: boolean };
    return { error: null, verified: body.verified };
  },

  /** Destroy the current session. */
  async signOut(): Promise<Result> {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (!res.ok) {
      return { error: await readError(res, "Noe gikk galt ved utlogging.") };
    }
    return { error: null };
  },
};
