"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { authClient } from "~/lib/auth-client";
import { cn } from "~/lib/utils";

interface UserAreaProps extends React.HTMLProps<HTMLDivElement> {
  name?: string;
  image?: string;
  admin?: boolean;
  isAuthenticated?: boolean;
}

export const UserArea = ({
  name = "Gjest",
  image = "",
  admin,
  isAuthenticated = false,
  className,
  ...props
}: UserAreaProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const signOutButton = async () => {
    setOpen(false);
    await authClient.signOut();
    router.push("/registrering");
    router.refresh();
  };

  const signInButton = () => {
    setOpen(false);
    router.push("/logg-inn");
  };

  const goToAdmin = () => {
    setOpen(false);
    router.push("/admin");
  };

  const goToMyPage = () => {
    setOpen(false);
    router.push("/min-side");
  };

  return (
    <div
      {...props}
      className={cn("flex w-fit items-center justify-center", className)}
    >
      <Popover
        onOpenChange={(open: boolean | ((prevState: boolean) => boolean)) =>
          setOpen(open)
        }
        open={open}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Profil"
            className="hover:bg-muted/50 rounded-full p-0.5 transition"
          >
            {isAuthenticated ? (
              <Avatar className="size-8">
                <AvatarImage
                  src={image}
                  alt={name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-muted/40 text-foreground text-xs font-medium">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="grid size-8 place-items-center">
                <UserRound className="text-foreground h-4 w-4" />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="text-foreground w-72 rounded-xl bg-popover p-5 shadow-md ring-1 ring-foreground/10"
        >
          <div className="flex w-full flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="border-border/60 bg-muted/40 h-10 w-10 border">
                <AvatarImage src={image} alt={"profilbilde"} />
                <AvatarFallback className="bg-muted/40">
                  <UserRound className="text-foreground h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">
                  {isAuthenticated ? `Hei, ${name}` : "Ikke logget inn"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {isAuthenticated
                    ? "Velkommen tilbake!"
                    : "Logg inn for å fortsette"}
                </p>
              </div>
            </div>

            {isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="border-border/60 bg-muted/40 text-foreground hover:bg-muted/60 w-full"
                  onClick={goToMyPage}
                >
                  Min side
                </Button>
                {admin ? (
                  <Button
                    variant="outline"
                    className="border-border/60 bg-muted/40 text-foreground hover:bg-muted/60 w-full"
                    onClick={goToAdmin}
                  >
                    Admin
                  </Button>
                ) : undefined}
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={signOutButton}
                >
                  Logg ut
                </Button>
              </div>
            ) : (
              <Button
                className="bg-primary/15 text-primary hover:bg-primary/25 w-full"
                onClick={signInButton}
              >
                Logg inn
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.slice(0, 1).toUpperCase())
      .join("") || "?"
  );
}
