"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { UsersTab } from "./users-tab";
import { GrupperTab } from "./grupper-tab";
import { AktiviteterTab } from "./aktiviteter-tab";

export function AdminPanel() {
  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full max-w-lg grid-cols-3 bg-[#1a2540] border border-[#73aac4]/30">
        <TabsTrigger
          value="users"
          className="data-[state=active]:bg-[#2c3a5d] data-[state=active]:text-white text-[#8694b4]"
        >
          Brukere
        </TabsTrigger>
        <TabsTrigger
          value="grupper"
          className="data-[state=active]:bg-[#2c3a5d] data-[state=active]:text-white text-[#8694b4]"
        >
          Faddergrupper
        </TabsTrigger>
        <TabsTrigger
          value="aktiviteter"
          className="data-[state=active]:bg-[#2c3a5d] data-[state=active]:text-white text-[#8694b4]"
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
