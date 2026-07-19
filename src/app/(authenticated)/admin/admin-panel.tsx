"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { UsersTab } from "./users-tab";
import { GrupperTab } from "./grupper-tab";
import { AktiviteterTab } from "./aktiviteter-tab";
import { BetalingerTab } from "./betalinger-tab";

export function AdminPanel() {
  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-secondary border border-border">
        <TabsTrigger
          value="users"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
        >
          Brukere
        </TabsTrigger>
        <TabsTrigger
          value="grupper"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
        >
          Faddergrupper
        </TabsTrigger>
        <TabsTrigger
          value="aktiviteter"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
        >
          Aktiviteter
        </TabsTrigger>
        <TabsTrigger
          value="betalinger"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
        >
          Betalinger
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="!mt-6">
        <UsersTab />
      </TabsContent>

      <TabsContent value="grupper" className="!mt-6">
        <GrupperTab />
      </TabsContent>

      <TabsContent value="aktiviteter" className="!mt-6">
        <AktiviteterTab />
      </TabsContent>

      <TabsContent value="betalinger" className="!mt-6">
        <BetalingerTab />
      </TabsContent>
    </Tabs>
  );
}
