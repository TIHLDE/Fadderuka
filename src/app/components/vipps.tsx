"use client";

import { Button } from "../../components/ui/button";
import { authClient } from "../../lib/auth-client";

export function VippsButton() {
  function loginVipps() {
    authClient.signIn.oauth2({
      providerId: "vipps",
    });
  }
  return <Button onClick={loginVipps}>Login med vipps</Button>;
}
