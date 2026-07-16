"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { UsersTab } from "./users-tab";
import { GrupperTab } from "./grupper-tab";
import { AktiviteterTab } from "./aktiviteter-tab";

export function AdminPanel() {
  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full max-w-lg grid-cols-3 bg-secondary border border-[#73aac4]/30">
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
    </Tabs>
  );
}
