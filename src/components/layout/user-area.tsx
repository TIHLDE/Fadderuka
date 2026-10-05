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
        <PopoverTrigger
          aria-label="Profil"
          className="relative flex items-center rounded-full"
        >
          {isAuthenticated ? (
            <Avatar className="size-8">
              <AvatarImage src={image} alt={name} className="object-cover" />
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="size-8">
              <AvatarFallback>
                <UserRound />
              </AvatarFallback>
            </Avatar>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <div className="flex w-full flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage src={image} alt={"profilbilde"} />
                <AvatarFallback>
                  <UserRound />
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
                {admin ? (
                  <Button
                    variant="outline"
                    className="w-full"
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
              <Button className="w-full" onClick={signInButton}>
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
