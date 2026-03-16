"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { UsersTab } from "./users-tab";
import { GrupperTab } from "./grupper-tab";

export function AdminPanel() {
  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 bg-[#1a2540] border border-[#73aac4]/30">
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
      </TabsList>

      <TabsContent value="users" className="!mt-6">
        <UsersTab />
      </TabsContent>

      <TabsContent value="grupper" className="!mt-6">
        <GrupperTab />
      </TabsContent>
    </Tabs>
  );
}
