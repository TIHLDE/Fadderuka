"use client";

import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "~/components/ui/use-toast";
import { api } from "~/trpc/react";

export function GrupperTab() {
  const [newGruppeName, setNewGruppeName] = useState("");
  const [expandedGruppe, setExpandedGruppe] = useState<string | null>(null);
  const [addMemberState, setAddMemberState] = useState<{
    gruppeId: string;
    role: "FADDER" | "FADDERBARN";
  } | null>(null);

  const utils = api.useUtils();

  const { data: grupper, isLoading } = api.admin.getGrupper.useQuery();
  const { data: users } = api.admin.getUsers.useQuery();

  const createMutation = api.admin.createGruppe.useMutation({
    onSuccess: () => {
      void utils.admin.getGrupper.invalidate();
      setNewGruppeName("");
      toast({ title: "Faddergruppe opprettet" });
    },
  });

  const deleteMutation = api.admin.deleteGruppe.useMutation({
    onSuccess: () => {
      void utils.admin.getGrupper.invalidate();
      toast({ title: "Faddergruppe slettet" });
    },
  });

  const addMemberMutation = api.admin.addMember.useMutation({
    onSuccess: () => {
      void utils.admin.getGrupper.invalidate();
      void utils.admin.getUsers.invalidate();
      setAddMemberState(null);
      toast({ title: "Medlem lagt til" });
    },
    onError: (err) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = api.admin.removeMember.useMutation({
    onSuccess: () => {
      void utils.admin.getGrupper.invalidate();
      void utils.admin.getUsers.invalidate();
      toast({ title: "Medlem fjernet" });
    },
  });

  const updateRoleMutation = api.admin.updateMemberRole.useMutation({
    onSuccess: () => {
      void utils.admin.getGrupper.invalidate();
      void utils.admin.getUsers.invalidate();
      toast({ title: "Rolle oppdatert" });
    },
  });

  const handleCreateGruppe = (e: FormEvent) => {
    e.preventDefault();
    if (!newGruppeName.trim()) return;
    createMutation.mutate({ name: newGruppeName.trim() });
  };

  // Get verified users who are not in the currently expanded group
  const getAvailableUsers = (gruppeId: string) => {
    if (!users || !grupper) return [];
    const gruppe = grupper.find((g) => g.id === gruppeId);
    const memberIds = new Set(gruppe?.members.map((m) => m.userId) ?? []);
    return users.filter((u) => u.isVerified && !memberIds.has(u.id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center !py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#73aac4] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="!space-y-6">
      {/* Create new gruppe */}
      <form onSubmit={handleCreateGruppe} className="flex !gap-3">
        <input
          type="text"
          placeholder="Ny faddergruppe navn..."
          value={newGruppeName}
          onChange={(e) => setNewGruppeName(e.target.value)}
          className="flex-1 max-w-sm rounded-xl border border-[#73aac4]/40 bg-[#111a2f] !px-4 !py-2.5 text-sm text-white placeholder:text-[#5b6a8f] focus:outline-none focus:ring-2 focus:ring-[#73aac4]"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !newGruppeName.trim()}
          className="inline-flex items-center !gap-2 rounded-xl border border-[#73aac4] bg-[#212d49] !px-4 !py-2.5 text-sm font-semibold text-white transition hover:bg-[#29385a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Opprett
        </button>
      </form>

      {/* Grupper list */}
      <div className="!space-y-4">
        {grupper?.map((gruppe) => {
          const isExpanded = expandedGruppe === gruppe.id;
          const faddere = gruppe.members.filter((m) => m.role === "FADDER");
          const fadderbarn = gruppe.members.filter(
            (m) => m.role === "FADDERBARN",
          );

          return (
            <div
              key={gruppe.id}
              className="rounded-xl border border-[#73aac4]/40 bg-[color:var(--surface-soft)] backdrop-blur overflow-hidden"
            >
              {/* Gruppe header */}
              <button
                type="button"
                className="flex w-full items-center justify-between !px-5 !py-4 text-left transition hover:bg-[#1a2540]/50"
                onClick={() =>
                  setExpandedGruppe(isExpanded ? null : gruppe.id)
                }
              >
                <div className="flex items-center !gap-3">
                  <h3 className="text-lg font-semibold text-white">
                    {gruppe.name}
                  </h3>
                  <span className="text-sm text-[#8694b4]">
                    {gruppe.members.length} medlemmer
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-[#8694b4]" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-[#8694b4]" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-[#73aac4]/20 !px-5 !py-4 !space-y-5">
                  {/* Faddere section */}
                  <div className="!space-y-2">
                    <h4 className="text-sm font-semibold text-[#90dfed]">
                      Faddere ({faddere.length})
                    </h4>
                    {faddere.length > 0 ? (
                      <ul className="!space-y-1">
                        {faddere.map((member) => (
                          <li
                            key={member.id}
                            className="flex items-center justify-between rounded-lg !px-3 !py-2 hover:bg-[#1a2540]/50"
                          >
                            <div>
                              <span className="text-sm text-white">
                                {member.user.name}
                              </span>
                              <span className="!ml-2 text-xs text-[#5b6a8f]">
                                {member.user.email}
                              </span>
                            </div>
                            <div className="flex items-center !gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateRoleMutation.mutate({
                                    membershipId: member.id,
                                    role: "FADDERBARN",
                                  })
                                }
                                className="text-xs text-[#8694b4] hover:text-white transition"
                                title="Endre til fadderbarn"
                              >
                                Til fadderbarn
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  removeMemberMutation.mutate({
                                    membershipId: member.id,
                                  })
                                }
                                className="!p-1 text-red-400/70 hover:text-red-400 transition"
                                title="Fjern fra gruppen"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[#5b6a8f]">
                        Ingen faddere enda
                      </p>
                    )}
                  </div>

                  {/* Fadderbarn section */}
                  <div className="!space-y-2">
                    <h4 className="text-sm font-semibold text-[#6495e6]">
                      Fadderbarn ({fadderbarn.length})
                    </h4>
                    {fadderbarn.length > 0 ? (
                      <ul className="!space-y-1">
                        {fadderbarn.map((member) => (
                          <li
                            key={member.id}
                            className="flex items-center justify-between rounded-lg !px-3 !py-2 hover:bg-[#1a2540]/50"
                          >
                            <div>
                              <span className="text-sm text-white">
                                {member.user.name}
                              </span>
                              <span className="!ml-2 text-xs text-[#5b6a8f]">
                                {member.user.email}
                              </span>
                            </div>
                            <div className="flex items-center !gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateRoleMutation.mutate({
                                    membershipId: member.id,
                                    role: "FADDER",
                                  })
                                }
                                className="text-xs text-[#8694b4] hover:text-white transition"
                                title="Endre til fadder"
                              >
                                Til fadder
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  removeMemberMutation.mutate({
                                    membershipId: member.id,
                                  })
                                }
                                className="!p-1 text-red-400/70 hover:text-red-400 transition"
                                title="Fjern fra gruppen"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[#5b6a8f]">
                        Ingen fadderbarn enda
                      </p>
                    )}
                  </div>

                  {/* Add member form */}
                  {addMemberState?.gruppeId === gruppe.id ? (
                    <AddMemberForm
                      gruppeId={gruppe.id}
                      role={addMemberState.role}
                      availableUsers={getAvailableUsers(gruppe.id)}
                      onAdd={(userId) =>
                        addMemberMutation.mutate({
                          userId,
                          gruppeId: gruppe.id,
                          role: addMemberState.role,
                        })
                      }
                      onCancel={() => setAddMemberState(null)}
                      isPending={addMemberMutation.isPending}
                    />
                  ) : (
                    <div className="flex flex-wrap !gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAddMemberState({
                            gruppeId: gruppe.id,
                            role: "FADDER",
                          })
                        }
                        className="inline-flex items-center !gap-1.5 rounded-lg border border-[#73aac4]/30 !px-3 !py-1.5 text-xs font-medium text-[#90dfed] transition hover:bg-[#1a2540]"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Legg til fadder
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAddMemberState({
                            gruppeId: gruppe.id,
                            role: "FADDERBARN",
                          })
                        }
                        className="inline-flex items-center !gap-1.5 rounded-lg border border-[#73aac4]/30 !px-3 !py-1.5 text-xs font-medium text-[#6495e6] transition hover:bg-[#1a2540]"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Legg til fadderbarn
                      </button>
                    </div>
                  )}

                  {/* Delete gruppe button */}
                  <div className="border-t border-[#73aac4]/10 !pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Er du sikker pa at du vil slette "${gruppe.name}"? Alle medlemskap og meldinger vil bli slettet.`,
                          )
                        ) {
                          deleteMutation.mutate({ gruppeId: gruppe.id });
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center !gap-1.5 text-xs text-red-400/70 transition hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Slett gruppe
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {grupper?.length === 0 && (
          <p className="text-center text-[#8694b4] !py-8">
            Ingen faddergrupper opprettet enda. Bruk skjemaet over for a
            opprette en ny gruppe.
          </p>
        )}
      </div>
    </div>
  );
}

function AddMemberForm({
  role,
  availableUsers,
  onAdd,
  onCancel,
  isPending,
}: {
  gruppeId: string;
  role: "FADDER" | "FADDERBARN";
  availableUsers: { id: string; name: string; email: string }[];
  onAdd: (userId: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [search, setSearch] = useState("");

  const filtered = availableUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="rounded-lg border border-[#73aac4]/30 bg-[#111a2f] !p-4 !space-y-3">
      <p className="text-sm font-medium text-white">
        Legg til {role === "FADDER" ? "fadder" : "fadderbarn"}
      </p>
      <input
        type="text"
        placeholder="Sok etter bruker..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-[#73aac4]/30 bg-[#0d1525] !px-3 !py-2 text-sm text-white placeholder:text-[#5b6a8f] focus:outline-none focus:ring-1 focus:ring-[#73aac4]"
      />
      <div className="max-h-40 overflow-y-auto !space-y-1">
        {filtered.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => setSelectedUserId(user.id)}
            className={`flex w-full items-center justify-between rounded-lg !px-3 !py-2 text-left text-sm transition ${
              selectedUserId === user.id
                ? "bg-[#2c3a5d] text-white"
                : "text-[#8694b4] hover:bg-[#1a2540]"
            }`}
          >
            <span>{user.name}</span>
            <span className="text-xs text-[#5b6a8f]">{user.email}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-xs text-[#5b6a8f] !py-2">
            Ingen tilgjengelige brukere
          </p>
        )}
      </div>
      <div className="flex !gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg !px-3 !py-1.5 text-xs text-[#8694b4] hover:text-white transition"
        >
          Avbryt
        </button>
        <button
          type="button"
          onClick={() => {
            if (selectedUserId) onAdd(selectedUserId);
          }}
          disabled={!selectedUserId || isPending}
          className="rounded-lg bg-[#2c3a5d] !px-3 !py-1.5 text-xs font-medium text-white transition hover:bg-[#33466f] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Legg til
        </button>
      </div>
    </div>
  );
}
