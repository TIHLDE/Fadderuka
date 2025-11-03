import Logo from "~/components/ui/logo";

import HeaderButtonsWrapper from "./header-buttons-wrapper";
import HeaderSkeleton from "./header-skeleton";
import HeaderWrapper from "./header-wrapper";
import Link from "next/link";
import React, { Suspense } from "react";

type HeaderProps = React.HTMLProps<HTMLHeadElement>;

export default async function Header({ className, ...props }: HeaderProps) {
  return (
    <HeaderWrapper {...props}>
      <div className="hidden h-full w-full md:block">
        <Suspense fallback={<HeaderSkeleton />}>
          <HeaderButtonsWrapper />
        </Suspense>
      </div>
      <div className="flex w-full place-content-center md:hidden">
        <Link href={"/"}>
          <Logo />
        </Link>
      </div>
    </HeaderWrapper>
  );
}
