import HeaderButtonsWrapper from "./header-buttons-wrapper";
import HeaderSkeleton from "./header-skeleton";
import HeaderWrapper from "./header-wrapper";
import MobileHeader from "./mobile-header";
import React, { Suspense } from "react";

type HeaderProps = React.HTMLProps<HTMLHeadElement>;

export default async function Header({ ...props }: HeaderProps) {
  return (
    <HeaderWrapper {...props}>
      {/* Desktop */}
      <div className="hidden h-full w-full md:block">
        <Suspense fallback={<HeaderSkeleton />}>
          <HeaderButtonsWrapper />
        </Suspense>
      </div>

      {/* Mobile */}
      <div className="flex w-full md:hidden">
        <Suspense fallback={<div />}>
          <MobileHeader />
        </Suspense>
      </div>
    </HeaderWrapper>
  );
}
