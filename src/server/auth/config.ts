import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { oauth2 } from "better-auth/providers";
import { db } from "~/server/db";
import { env } from "../../env";

const VIPPS_PROVIDER_ID = "vipps";

const vippsProvider = oauth2({
  id: VIPPS_PROVIDER_ID,
  name: "Vipps",
  clientId: env.VIPPS_CLIENT_ID,
  clientSecret: env.VIPPS_CLIENT_SECRET,
  discoveryUrl:
    "https://api.vipps.no/access-management-1.0/access/.well-known/openid-configuration",
  scopes: ["openid", "userid", "profile", "groups-edu", "email"],
  async getUserInfo(tokens) {
    const response = await fetch(
      "https://api.vipps.no/vipps-userinfo-api/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      },
    );

    if (!response.ok) {
      return null;
    }

    const profile = await response.json();

    return {
      user: {
        id: profile.sub,
        name: profile.name ?? "",
        email: profile.email ?? null,
        image: profile.picture,
        emailVerified: profile.email_verified ?? false,
      },
      data: profile,
    };
  },
});

export const auth = betterAuth({
  database: prismaAdapter(db),
  providers: [vippsProvider],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
});
