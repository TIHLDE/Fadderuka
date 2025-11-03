"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { ModeToggle } from "~/components/ui/theme-mode-toggler";
import { cn } from "~/lib/utils";
import { UserRound } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

interface UserAreaProps extends React.HTMLProps<HTMLDivElement> {
  name: string;
  image: string;
  admin?: boolean;
}

export const UserArea = ({
  name,
  image,
  admin,
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
      className={cn("flex w-fit items-center justify-center gap-3", className)}
    >
      <Popover
        onOpenChange={(open: boolean | ((prevState: boolean) => boolean)) =>
          setOpen(open)
        }
        open={open}
      >
        <PopoverTrigger>
          <Avatar>
            <AvatarImage src={image} alt={"profilbilde"} />
            <AvatarFallback>
              <UserRound className="text-foreground" />
            </AvatarFallback>
          </Avatar>
        </PopoverTrigger>
        <PopoverContent>
          <div className="flex w-full flex-col content-center items-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={image} alt={"profilbilde"} />
              <AvatarFallback>
                <UserRound className="text-foreground" />
              </AvatarFallback>
            </Avatar>
            <span className="scroll-m-20 text-2xl font-semibold tracking-tight">
              Hei, {name}
            </span>
            <Button
              variant={"destructive"}
              className="mt-2 w-full"
              onClick={signOutButton}
            >
              Logg ut
            </Button>
            <Button
              variant={"outline"}
              className="mt-1 w-full"
              onClick={goToMyPage}
            >
              Min side
            </Button>
            {admin ? (
              <Button
                variant={"outline"}
                className="mt-1 w-full"
                onClick={goToAdmin}
              >
                Admin
              </Button>
            ) : undefined}
          </div>
        </PopoverContent>
      </Popover>
      <ModeToggle />
    </div>
  );
};
