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
        "sticky top-0 z-50 flex min-h-[80px] w-full items-center p-4 py-1 transition-all duration-300",
        isScrolled ? "bg-background/80 border-b backdrop-blur-sm" : "",
        className,
      )}
      {...props}
    >
      {children}
    </header>
  );
}
