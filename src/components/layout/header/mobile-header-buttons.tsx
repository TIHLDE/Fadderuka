import Link from "next/link";
import Logo from "~/components/ui/logo";
import { ThemeToggle } from "~/components/ui/theme-mode-toggler";
import getHeaderUserContext from "./get-header-user-context";
import { MobileNavMenu } from "./mobile-nav-menu";
import { NotificationBell } from "./notification-bell";
import { UserArea } from "../user-area";

export default async function MobileHeaderButtons() {
  const { session, isGruppeMember } = await getHeaderUserContext();

  return (
    <div className="flex w-full items-center justify-between">
      <MobileNavMenu
        isAdmin={!!session?.user?.isAdmin}
        isGruppeMember={isGruppeMember}
      />
      <Link href="/" aria-label="TIHLDE">
        <Logo />
      </Link>
      <div className="text-muted-foreground flex items-center">
        {session?.user ? <NotificationBell /> : null}
        <ThemeToggle
          aria-label="Bytt tema"
          className="text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-md border-transparent bg-transparent p-2"
          variant="ghost"
          size="icon"
        />
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
