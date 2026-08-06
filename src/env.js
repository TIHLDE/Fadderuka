import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    /**
     * Photon OAuth client credentials for "Logg inn med TIHLDE". Registered on
     * Photon as a confidential client; without them the login page can only say
     * that sign-in is not configured.
     */
    /**
     * Lepton, still the source for the public event list (`src/server/tihlde/
     * events.ts`). Authentication no longer goes here — see the PHOTON_* vars.
     */
    TIHLDE_API_URL: z.string().url().default("https://api.tihlde.org"),
    PHOTON_OAUTH_CLIENT_ID: z.string().optional(),
    PHOTON_OAUTH_CLIENT_SECRET: z.string().optional(),
    /**
     * API key with the `users:create` permission, used by our own sign-up form
     * to create the TIHLDE account on Photon (`POST /api/user/register`).
     */
    PHOTON_REGISTER_API_KEY: z.string().optional(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    VIPPS_CLIENT_ID: z.string().optional(),
    VIPPS_CLIENT_SECRET: z.string().optional(),
    VIPPS_MERCHANT_SERIAL_NUMBER: z.string().optional(),
    VIPPS_SUBSCRIPTION_KEY: z.string().optional(),
    VIPPS_API_URL: z.string().url().optional(),
    VIPPS_CALLBACK_URL: z.string().url().optional(),
    /**
     * Shared secret Vipps signs its webhooks with, from the Webhooks API
     * registration. Optional: until it is set the webhook keeps working by
     * re-verifying every event against the Vipps API instead.
     */
    VIPPS_WEBHOOK_SECRET: z.string().optional(),
    /**
     * Admission year of this year's 1. klasse — the students fadderuka is run
     * for. Everyone admitted earlier is in 2. klasse or higher and never pays.
     * Pin it each year so the decision never rides on the server clock; left
     * unset it is derived from the calendar (see `src/server/fadder.ts`).
     */
    FADDERUKE_COHORT_YEAR: z
      .string()
      .regex(/^\d{4}$/, "FADDERUKE_COHORT_YEAR må være et årstall, f.eks. 2026")
      .optional(),
    /**
     * 32-byte hex key encrypting the Photon access tokens we hold on behalf of
     * logged-in users. Generate with `openssl rand -hex 32`. Without it the
     * tokens are simply not stored — nothing is ever written in clear text.
     */
    SESSION_ENCRYPTION_KEY: z
      .string()
      .regex(/^[0-9a-fA-F]{64}$/, "SESSION_ENCRYPTION_KEY må være 64 hex-tegn")
      .optional(),
    /**
     * Photon's API, which sends our email for us (`POST /api/email/send`).
     * Fadderuka has no mail setup of its own — see `src/server/email/photon.ts`.
     */
    PHOTON_API_URL: z.string().url().default("https://photon.tihlde.org"),
    /**
     * Shared secret for that endpoint, matching `EMAIL_API_KEY` on the Photon
     * server. Unset, no mail is sent and "glemt passord" answers that the
     * feature is unavailable rather than pretending a mail went out.
     */
    PHOTON_EMAIL_API_KEY: z.string().optional(),
    /**
     * Public origin of this app. It is the OAuth redirect URI's base, so it
     * must match what Photon has registered — and it is set explicitly rather
     * than read off the request's Host header, which an attacker controls.
     */
    APP_URL: z.string().url().optional(),
  },

  client: {},

  runtimeEnv: {
    TIHLDE_API_URL: process.env.TIHLDE_API_URL,
    PHOTON_OAUTH_CLIENT_ID: process.env.PHOTON_OAUTH_CLIENT_ID,
    PHOTON_OAUTH_CLIENT_SECRET: process.env.PHOTON_OAUTH_CLIENT_SECRET,
    PHOTON_REGISTER_API_KEY: process.env.PHOTON_REGISTER_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    VIPPS_CLIENT_ID: process.env.VIPPS_CLIENT_ID,
    VIPPS_CLIENT_SECRET: process.env.VIPPS_CLIENT_SECRET,
    VIPPS_MERCHANT_SERIAL_NUMBER: process.env.VIPPS_MERCHANT_SERIAL_NUMBER,
    VIPPS_SUBSCRIPTION_KEY: process.env.VIPPS_SUBSCRIPTION_KEY,
    VIPPS_API_URL: process.env.VIPPS_API_URL,
    VIPPS_CALLBACK_URL: process.env.VIPPS_CALLBACK_URL,
    VIPPS_WEBHOOK_SECRET: process.env.VIPPS_WEBHOOK_SECRET,
    FADDERUKE_COHORT_YEAR: process.env.FADDERUKE_COHORT_YEAR,
    SESSION_ENCRYPTION_KEY: process.env.SESSION_ENCRYPTION_KEY,
    PHOTON_API_URL: process.env.PHOTON_API_URL,
    PHOTON_EMAIL_API_KEY: process.env.PHOTON_EMAIL_API_KEY,
    APP_URL: process.env.APP_URL,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
