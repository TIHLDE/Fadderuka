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
        "sticky top-0 z-50 flex w-full items-center justify-between transition-all duration-300",
        isScrolled
          ? "border-b border-border bg-background/80 backdrop-blur-sm"
          : "bg-transparent",
        className,
      )}
      style={{ paddingTop: '1.25rem', paddingBottom: '1.75rem', paddingLeft: '2.5rem', paddingRight: '3rem' }}
      {...props}
    >
      {children}
    </header>
  );
}
