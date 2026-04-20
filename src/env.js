import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
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
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    VIPPS_CLIENT_ID: process.env.VIPPS_CLIENT_ID,
    VIPPS_CLIENT_SECRET: process.env.VIPPS_CLIENT_SECRET,
    VIPPS_MERCHANT_SERIAL_NUMBER: process.env.VIPPS_MERCHANT_SERIAL_NUMBER,
    VIPPS_SUBSCRIPTION_KEY: process.env.VIPPS_SUBSCRIPTION_KEY,
    VIPPS_API_URL: process.env.VIPPS_API_URL,
    VIPPS_CALLBACK_URL: process.env.VIPPS_CALLBACK_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
