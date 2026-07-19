import HeaderButtonsWrapper from "./header-buttons-wrapper";
import HeaderSkeleton from "./header-skeleton";
import HeaderWrapper from "./header-wrapper";
import MobileHeaderButtons from "./mobile-header-buttons";
import MobileHeaderSkeleton from "./mobile-header-skeleton";
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
      <div className="flex w-full md:hidden">
        <Suspense fallback={<MobileHeaderSkeleton />}>
          <MobileHeaderButtons />
        </Suspense>
      </div>
    </HeaderWrapper>
  );
}
