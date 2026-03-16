"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { UserRound } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

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
    await signOut();
    router.refresh();
  };

  const signInButton = async () => {
    setOpen(false);
    await signIn();
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
            className="rounded-md p-2 transition hover:bg-accent hover:text-foreground"
          >
            <UserRound className="h-[18px] w-[18px]" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-72 rounded-2xl border border-white/10 bg-[#0f172a]/95 p-5 text-slate-100 shadow-xl backdrop-blur"
        >
          <div className="flex w-full flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-white/10 bg-white/5">
                <AvatarImage src={image} alt={"profilbilde"} />
                <AvatarFallback className="bg-white/5">
                  <UserRound className="h-5 w-5 text-slate-200" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">
                  {isAuthenticated ? `Hei, ${name}` : "Ikke logget inn"}
                </p>
                <p className="text-xs text-slate-400">
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
                  className="w-full border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  onClick={goToMyPage}
                >
                  Min side
                </Button>
                {admin ? (
                  <Button
                    variant="outline"
                    className="w-full border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
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
                className="w-full bg-sky-500/20 text-sky-100 hover:bg-sky-500/30"
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
