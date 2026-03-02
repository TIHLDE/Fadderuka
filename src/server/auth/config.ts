import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";
import { db } from "~/server/db";
import { env } from "../../env";

const VIPPS_PROVIDER_ID = "vipps";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: VIPPS_PROVIDER_ID,
          clientId: env.VIPPS_CLIENT_ID,
          clientSecret: env.VIPPS_CLIENT_SECRET,
          redirectURI: `http://localhost:4000/api/auth/callback/${VIPPS_PROVIDER_ID}`,
          discoveryUrl:
            "https://apitest.vipps.no/access-management-1.0/access/.well-known/openid-configuration",
          scopes: ["openid", "name", "phoneNumber", "email"],
          async getUserInfo(tokens) {
            console.log(tokens);
            const response = await fetch(
              "https://apitest.vipps.no/vipps-userinfo-api/userinfo",
              {
                headers: {
                  Authorization: `Bearer ${tokens.accessToken}`,
                  "Ocp-Apim-Subscription-Key": env.VIPPS_SUBSCRIPTION_KEY,
                },
              },
            );

            if (!response.ok) {
              return null;
            }

            const profile = await response.json();

            // return {
            //   user: {
            //     id: profile.sub,
            //     name: profile.name ?? "",
            //     email: profile.email ?? null,
            //     image: profile.picture,
            //     emailVerified: profile.email_verified ?? false,
            //   },
            //   data: profile,
            // };
            return {
              emailVerified: profile.email_verified ?? false,
              email: profile.email ?? null,
              id: profile.sub,
              name: profile.name ?? "",
              image: profile.picture,
            };
          },
        },
      ],
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
});
