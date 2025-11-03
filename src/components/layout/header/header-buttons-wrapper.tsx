import HeaderLink from "~/components/ui/header-link";
import Logo from "~/components/ui/logo";
import { UserArea } from "../user-area";
import { auth } from "~/auth";
import { cn } from "~/lib/utils";
import React from "react";

const HeaderButtonsWrapper = async ({
  className,
  ...props
}: React.HTMLProps<HTMLDivElement>) => {
  const session = await auth();

  return (
    <div
      {...props}
      className={cn("flex h-full w-full items-center justify-start", className)}
    >
      <nav className="flex w-full items-center gap-6">
        <HeaderLink href="/" className="mr-16">
          <Logo />
        </HeaderLink>
        <HeaderLink href="/activites">Aktiviteter</HeaderLink>
      </nav>

      {session?.user ? (
        <UserArea
          name={session.user.firstName ?? ""}
          image={session.user.profilePicture ?? ""}
          admin={session.user.role == "ADMIN"}
        />
      ) : undefined}
    </div>
  );
};

export default HeaderButtonsWrapper;
