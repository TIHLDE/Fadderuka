"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AktiviteterTab } from "./aktiviteter-tab";
import { BetalingerTab } from "./betalinger-tab";
import { GrupperTab } from "./grupper-tab";
import { UsersTab } from "./users-tab";

export function AdminPanel() {
  return (
    <Tabs defaultValue="users" className="gap-6">
      {/* Fanelinja kan scrolle sidelengs på smale skjermer i stedet for å
          presse fanene sammen. */}
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
        <TabsList>
          <TabsTrigger value="users">Brukere</TabsTrigger>
          <TabsTrigger value="grupper">Faddergrupper</TabsTrigger>
          <TabsTrigger value="aktiviteter">Aktiviteter</TabsTrigger>
          <TabsTrigger value="betalinger">Betalinger</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="users">
        <UsersTab />
      </TabsContent>
      <TabsContent value="grupper">
        <GrupperTab />
      </TabsContent>
      <TabsContent value="aktiviteter">
        <AktiviteterTab />
      </TabsContent>
      <TabsContent value="betalinger">
        <BetalingerTab />
      </TabsContent>
    </Tabs>
  );
}
