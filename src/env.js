import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    TIHLDE_API_URL: z.string().url().default("https://api.tihlde.org"),
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

  client: {},

  runtimeEnv: {
    TIHLDE_API_URL: process.env.TIHLDE_API_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    VIPPS_CLIENT_ID: process.env.VIPPS_CLIENT_ID,
    VIPPS_CLIENT_SECRET: process.env.VIPPS_CLIENT_SECRET,
    VIPPS_MERCHANT_SERIAL_NUMBER: process.env.VIPPS_MERCHANT_SERIAL_NUMBER,
    VIPPS_SUBSCRIPTION_KEY: process.env.VIPPS_SUBSCRIPTION_KEY,
    VIPPS_API_URL: process.env.VIPPS_API_URL,
    VIPPS_CALLBACK_URL: process.env.VIPPS_CALLBACK_URL,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
