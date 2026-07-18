import { headers } from "next/headers";
import Link from "next/link";
import Logo from "~/components/ui/logo";
import { auth } from "~/server/auth/config";
import { MobileNavMenu } from "./mobile-nav-menu";
import { NotificationBell } from "./notification-bell";
import { UserArea } from "../user-area";

export default async function MobileHeaderButtons() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="flex w-full items-center justify-between">
      <MobileNavMenu isAdmin={!!session?.user?.isAdmin} />
      <Link href="/">
        <Logo />
      </Link>
      <div className="text-muted-foreground flex items-center">
        {session?.user ? <NotificationBell /> : null}
        <UserArea
          name={session?.user?.name ?? "Gjest"}
          image={session?.user?.image ?? ""}
          admin={!!session?.user?.isAdmin}
          isAuthenticated={!!session?.user}
        />
      </div>
    </div>
  );
}
