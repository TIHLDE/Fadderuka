"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

type RevealProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Delay in ms before the reveal starts once in view (for staggering). */
  delay?: number;
};

/**
 * Wraps content and fades/slides it up the first time it scrolls into view.
 * GPU-safe (transform + opacity + blur only) and skips animation entirely
 * when the user prefers reduced motion.
 */
export function Reveal({ delay = 0, className, style, ...props }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms`, ...style }}
      className={cn(
        "transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
        shown
          ? "translate-y-0 opacity-100 blur-0"
          : "translate-y-4 opacity-0 blur-[2px]",
        className,
      )}
      {...props}
    />
  );
}
