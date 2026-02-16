import { Bell } from "lucide-react";
import { headers } from "next/headers";
import React from "react";
import HeaderLink from "~/components/ui/header-link";
import Logo from "~/components/ui/logo";
import { ThemeToggle } from "~/components/ui/theme-mode-toggler";
import { cn } from "~/lib/utils";
import { auth } from "~/server/auth/config";
import { UserArea } from "../user-area";

const HeaderButtonsWrapper = async ({
  className,
  ...props
}: React.HTMLProps<HTMLDivElement>) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div
      {...props}
      className={cn(
        "flex h-full w-full items-center justify-between",
        className,
      )}
    >
      <nav className="flex items-center gap-8">
        <HeaderLink
          href="/"
          className="mr-10 p-0 hover:bg-transparent"
          aria-label="TIHLDE"
        >
          <Logo />
        </HeaderLink>
        <HeaderLink className="text-foreground" href="/">
          Generelt
        </HeaderLink>
        <HeaderLink
          className="text-muted-foreground hover:text-foreground"
          href="/aktiviteter"
        >
          Arrangementer
        </HeaderLink>
        <HeaderLink
          className="text-muted-foreground hover:text-foreground"
          href="/faddergruppe"
        >
          Min faddergruppe
        </HeaderLink>
      </nav>

      <div className="text-muted-foreground flex items-center gap-3">
        <button
          aria-label="Varsler"
          className="hover:bg-muted/50 hover:text-foreground rounded-md p-2 transition"
          type="button"
        >
          <Bell className="h-4 w-4" />
        </button>
        <ThemeToggle
          aria-label="Bytt tema"
          className="text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-md border-transparent bg-transparent p-2"
          variant="ghost"
          size="icon"
        />
        <UserArea
          name={session?.user?.firstName ?? "Gjest"}
          image={session?.user?.profilePicture ?? ""}
          admin={session?.user?.role == "ADMIN"}
          isAuthenticated={!!session?.user}
        />
      </div>
    </div>
  );
};

export default HeaderButtonsWrapper;
