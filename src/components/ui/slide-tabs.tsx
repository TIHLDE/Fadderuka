"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import type { LucideIcon } from "lucide-react";

import { cn } from "~/lib/utils";

/**
 * Motion-drevne fane-primitiver: en pille som fjærer mellom valgt fane, og et
 * innholdsfelt som toner inn når fanen byttes. Delt i to slik at hver bruker
 * kan plassere linja der den vil.
 */

export type SlideTab<V extends string = string> = {
  value: V;
  label: React.ReactNode;
  icon?: LucideIcon;
};

type SlideTabsBarProps<V extends string> = {
  tabs: readonly SlideTab<V>[];
  value: V;
  onValueChange: (value: V) => void;
  /** Like brede kolonner (bra for 2–4 faner). Av = auto bredde + h-scroll. */
  stretch?: boolean;
  className?: string;
  tabClassName?: string;
};

export function SlideTabsBar<V extends string>({
  tabs,
  value,
  onValueChange,
  stretch = false,
  className,
  tabClassName,
}: SlideTabsBarProps<V>) {
  // Unik per instans så flere linjer på samme side ikke deler pille.
  const layoutId = React.useId();

  return (
    <div
      className={cn(
        "relative flex items-center rounded-xl border border-border bg-secondary !p-1",
        stretch ? "w-full" : "w-fit max-w-full overflow-x-auto",
        className,
      )}
      role="tablist"
    >
      {tabs.map((t) => {
        const active = value === t.value;
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(t.value)}
            className={cn(
              "relative z-10 inline-flex cursor-pointer items-center justify-center !gap-1.5 rounded-lg !px-3 !py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              stretch ? "flex-1" : "shrink-0",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
              tabClassName,
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 -z-10 rounded-lg bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {Icon && <Icon className="size-3.5" />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

type AnimatedTabPanelProps = {
  /** Endres når aktiv fane endres; driver inn/ut-animasjonen. */
  activeKey: string;
  children: React.ReactNode;
  className?: string;
};

export function AnimatedTabPanel({
  activeKey,
  children,
  className,
}: AnimatedTabPanelProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeKey}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
        transition={{ duration: 0.15 }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
