import HeaderLink from "~/components/ui/header-link";
import Logo from "~/components/ui/logo";
import { UserArea } from "../user-area";
import { auth } from "~/server/auth";
import { cn } from "~/lib/utils";
import { ThemeToggle } from "~/components/ui/theme-mode-toggler";
import { Bell } from "lucide-react";
import React from "react";

const HeaderButtonsWrapper = async ({
  className,
  ...props
}: React.HTMLProps<HTMLDivElement>) => {
  const session = await auth();

  return (
    <div
      {...props}
      className={cn(
        "flex h-full w-full items-center justify-between",
        className,
      )}
    >
      {/* Logo – venstre */}
      <div className="flex flex-1">
        <HeaderLink
          href="/"
          className="p-0 hover:bg-transparent"
          aria-label="TIHLDE"
        >
          <Logo />
        </HeaderLink>
      </div>

      {/* Nav – sentrert */}
      <nav className="flex items-center gap-6">
        <HeaderLink href="/">Generelt</HeaderLink>
        <HeaderLink href="/aktiviteter">Arrangementer</HeaderLink>
      </nav>

      {/* Ikoner – høyre */}
      <div className="flex flex-1 items-center justify-end gap-3 text-foreground/60 dark:text-foreground/80">
        <button
          aria-label="Varsler"
          className="rounded-md p-2 transition hover:bg-accent hover:text-foreground"
          type="button"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <ThemeToggle className="rounded-md p-2 transition hover:bg-accent hover:text-foreground" />
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
