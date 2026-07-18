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
        "sticky top-0 z-50 flex min-h-[64px] w-full items-center !px-6 bg-background/80 backdrop-blur transition-colors duration-200",
        isScrolled ? "border-b border-border/60" : "border-b border-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </header>
  );
}
