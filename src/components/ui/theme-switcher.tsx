"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, type ComponentProps } from "react";

import { Button } from "~/components/ui/button";

type ThemeSwitcherProps = Omit<
  ComponentProps<typeof Button>,
  "aria-label" | "children" | "onClick" | "size" | "variant"
>;

export function ThemeSwitcher(props: ThemeSwitcherProps) {
  const { resolvedTheme, setTheme } = useTheme();
  // The server has no way to know which theme the client resolved to, so the
  // icon stays empty until after hydration rather than rendering a sun that
  // flips to a moon on the first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Button
      {...props}
      variant="ghost"
      size="icon"
      aria-label="Bytt tema"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted ? resolvedTheme === "dark" ? <Sun /> : <Moon /> : null}
    </Button>
  );
}
