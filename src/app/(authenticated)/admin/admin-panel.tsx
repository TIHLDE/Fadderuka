"use client";

import { useState } from "react";
import {
  AnimatedTabPanel,
  SlideTabsBar,
  type SlideTab,
} from "~/components/ui/slide-tabs";
import { UsersTab } from "./users-tab";
import { GrupperTab } from "./grupper-tab";
import { AktiviteterTab } from "./aktiviteter-tab";
import { BetalingerTab } from "./betalinger-tab";

type TabValue = "users" | "grupper" | "aktiviteter" | "betalinger";

const TABS: readonly SlideTab<TabValue>[] = [
  { value: "users", label: "Brukere" },
  { value: "grupper", label: "Faddergrupper" },
  { value: "aktiviteter", label: "Aktiviteter" },
  { value: "betalinger", label: "Betalinger" },
];

export function AdminPanel() {
  const [tab, setTab] = useState<TabValue>("users");

  return (
    <div className="w-full">
      <SlideTabsBar
        tabs={TABS}
        value={tab}
        onValueChange={setTab}
        stretch
        className="max-w-2xl"
      />

      <AnimatedTabPanel activeKey={tab} className="!mt-6">
        {tab === "users" && <UsersTab />}
        {tab === "grupper" && <GrupperTab />}
        {tab === "aktiviteter" && <AktiviteterTab />}
        {tab === "betalinger" && <BetalingerTab />}
      </AnimatedTabPanel>
    </div>
  );
}
