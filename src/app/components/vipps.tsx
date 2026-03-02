"use client";

import { Button } from "../../components/ui/button";
import { authClient } from "../../lib/auth-client";

export function VippsButton() {
  async function loginVipps() {
    await authClient.signIn.oauth2({
      providerId: "vipps",
      callbackURL: "/",
    });
  }
  return <Button onClick={loginVipps}>Login med vipps</Button>;
}
