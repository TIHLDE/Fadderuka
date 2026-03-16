import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "~/server/db";
import { env } from "../../env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      isVerified: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
      isAdmin: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
    },
  },
});
