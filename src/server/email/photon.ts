import "server-only";

import { env } from "~/env";

/**
 * Outgoing email, sent through Photon's email API.
 *
 * Fadderuka has no mail infrastructure of its own, and getting some would mean
 * a new provider account plus DKIM/SPF records on tihlde.org — DNS we do not
 * control. Photon already sends from `no-reply@tihlde.org` over TIHLDE's own
 * SMTP relay, and exposes `POST /api/email/send` for exactly this: an external
 * service handing it a subject and a few content blocks.
 *
 * Auth is a shared secret (`PHOTON_EMAIL_API_KEY`), not a user token, so this
 * must only ever be called from the server.
 */

/** The block types Photon's `CustomEmail` template renders. */
export type EmailBlock =
  | { type: "title"; content: string }
  | { type: "text"; content: string }
  | { type: "button"; text: string; url: string };

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("PHOTON_EMAIL_API_KEY er ikke satt — e-post kan ikke sendes.");
    this.name = "EmailNotConfiguredError";
  }
}

export class EmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailSendError";
  }
}

/** Whether email is switched on at all. Lets callers degrade instead of throw. */
export function isEmailConfigured(): boolean {
  return Boolean(env.PHOTON_EMAIL_API_KEY);
}

/**
 * Send one email. Throws `EmailNotConfiguredError` when the key is missing and
 * `EmailSendError` when Photon rejects it, so the caller decides what the user
 * gets told — for password resets that is deliberately nothing specific.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  content: EmailBlock[];
}): Promise<void> {
  const apiKey = env.PHOTON_EMAIL_API_KEY;
  if (!apiKey) throw new EmailNotConfiguredError();

  let response: Response;
  try {
    response = await fetch(`${env.PHOTON_API_URL}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(input),
      // Photon queues the mail and answers immediately; if it cannot, we would
      // rather fail than hold the request open.
      signal: AbortSignal.timeout(10_000),
    });
  } catch (cause) {
    throw new EmailSendError(
      `Fikk ikke kontakt med Photon: ${cause instanceof Error ? cause.message : "ukjent feil"}`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new EmailSendError(
      `Photon svarte ${response.status} på e-postsending. ${body.slice(0, 200)}`,
    );
  }
}
