/**
 * Thin client-side auth helpers that talk to our own /api/auth routes.
 *
 * Signing IN is not here: it is a plain link to `/api/auth/logg-inn`, which
 * redirects to Photon. There is nothing to submit, and nothing this app could
 * do with a password.
 */

interface Result {
  error: string | null;
}

/** New-user self-registration payload (mirrors /api/auth/register). */
export interface RegisterInput {
  full_name: string;
  /** Must be @stud.ntnu.no — Photon derives the username from it. */
  email: string;
  password: string;
  study: string;
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

  /** Destroy the current session. */
  async signOut(): Promise<Result> {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (!res.ok) {
      return { error: await readError(res, "Noe gikk galt ved utlogging.") };
    }
    return { error: null };
  },
};
