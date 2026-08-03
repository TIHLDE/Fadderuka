/**
 * Thin client-side auth helpers that talk to our own /api/auth routes, which
 * in turn proxy to TIHLDE. Replaces the previous better-auth React client.
 */

interface Result {
  error: string | null;
}

interface SignInResult extends Result {
  /** True when the user is already verified (e.g. an admin) and owes no payment. */
  verified: boolean;
}

/** New-user self-registration payload (mirrors /api/auth/register). */
export interface RegisterInput {
  full_name: string;
  email: string;
  user_id: string;
  password: string;
  study: string;
}

interface RegisterResult extends Result {
  /** Which form field the error belongs to, when the server could tell. */
  field?: string;
  /**
   * Set when the failure was "you already have an account": the username they
   * should log in as. Lets the form offer the way out instead of leaving them
   * to guess which field to change.
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
  /**
   * Log in with a TIHLDE username + password.
   *
   * `study` is the slug of a programme the user is STARTING this autumn, for
   * the case where TIHLDE's profile still shows the one they came from (see
   * /api/auth/login). Omitted for everyone else, which is almost everyone.
   */
  async signIn(
    userId: string,
    password: string,
    study?: string,
  ): Promise<SignInResult> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, password, study }),
    });

    if (!res.ok) {
      return {
        error: await readError(res, "Noe gikk galt ved innlogging."),
        verified: false,
      };
    }

    const body = (await res.json().catch(() => null)) as {
      verified?: boolean;
    } | null;
    return { error: null, verified: body?.verified ?? false };
  },

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

  /** Destroy the current session. */
  async signOut(): Promise<Result> {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (!res.ok) {
      return { error: await readError(res, "Noe gikk galt ved utlogging.") };
    }
    return { error: null };
  },
};
