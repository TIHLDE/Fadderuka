"use client";

import { cn } from "~/lib/utils";
import React, { useEffect, useState } from "react";

type HeaderWrapperProps = React.HTMLProps<HTMLHeadElement>;

export default function HeaderWrapper({
  children,
  className,
  ...props
}: HeaderWrapperProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex min-h-[72px] w-full items-center !px-6 transition-all duration-300",
        isScrolled
          ? "border-b border-border/60 bg-[color:var(--header-bg)] backdrop-blur-sm"
          : "bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </header>
  );
}
