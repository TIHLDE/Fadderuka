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
import { compareMajorLabels, findMajor, UKJENT_STUDIERETNING } from "~/lib/majors";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";

type Gruppe = RouterOutputs["admin"]["getGrupper"][number];

/** A gruppe only ever holds students of one major; derive it from its members. */
function gruppeMajor(gruppe: Gruppe): string {
  for (const member of gruppe.members) {
    const major = findMajor(member.user.studieretning);
    if (major) return major;
  }
  return UKJENT_STUDIERETNING;
}

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

  // Categorize grupper by major, sorted in canonical major order
  const byMajor = new Map<string, Gruppe[]>();
  for (const gruppe of grupper ?? []) {
    const major = gruppeMajor(gruppe);
    const bucket = byMajor.get(major) ?? [];
    bucket.push(gruppe);
    byMajor.set(major, bucket);
  }
  const groupsByMajor = [...byMajor.entries()].sort(([a], [b]) =>
    compareMajorLabels(a, b),
  );

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
          className="flex-1 max-w-sm rounded-xl border border-[#73aac4]/40 bg-background !px-4 !py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#73aac4]"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !newGruppeName.trim()}
          className="inline-flex items-center !gap-2 rounded-xl border border-[#73aac4] bg-secondary !px-4 !py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Opprett
        </button>
      </form>

      {/* Grupper list, categorized and sorted by major */}
      <div className="!space-y-8">
        {groupsByMajor.map(([major, grupperIMajor]) => (
          <section key={major} className="!space-y-4">
            <div className="flex items-center !gap-3">
              <h3 className="text-base font-semibold text-[#90dfed]">
                {major}
              </h3>
              <span className="text-sm text-muted-foreground">
                {grupperIMajor.length}{" "}
                {grupperIMajor.length === 1 ? "gruppe" : "grupper"}
              </span>
            </div>
            <div className="!space-y-4">
              {grupperIMajor.map((gruppe) => {
                const isExpanded = expandedGruppe === gruppe.id;
                const faddere = gruppe.members.filter(
                  (m) => m.role === "FADDER",
                );
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
                      className="flex w-full items-center justify-between !px-5 !py-4 text-left transition hover:bg-muted/50"
                      onClick={() =>
                        setExpandedGruppe(isExpanded ? null : gruppe.id)
                      }
                    >
                      <div className="flex items-center !gap-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {gruppe.name}
                        </h3>
                        <span className="text-sm text-muted-foreground">
                          {gruppe.members.length} medlemmer
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
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
                                  className="flex items-center justify-between rounded-lg !px-3 !py-2 hover:bg-muted/50"
                                >
                                  <div>
                                    <span className="text-sm text-foreground">
                                      {member.user.name}
                                    </span>
                                    <span className="!ml-2 text-xs text-muted-foreground">
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
                                      className="text-xs text-muted-foreground hover:text-foreground transition"
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
                            <p className="text-sm text-muted-foreground">
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
                                  className="flex items-center justify-between rounded-lg !px-3 !py-2 hover:bg-muted/50"
                                >
                                  <div>
                                    <span className="text-sm text-foreground">
                                      {member.user.name}
                                    </span>
                                    <span className="!ml-2 text-xs text-muted-foreground">
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
                                      className="text-xs text-muted-foreground hover:text-foreground transition"
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
                            <p className="text-sm text-muted-foreground">
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
                              className="inline-flex items-center !gap-1.5 rounded-lg border border-[#73aac4]/30 !px-3 !py-1.5 text-xs font-medium text-[#90dfed] transition hover:bg-muted"
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
                              className="inline-flex items-center !gap-1.5 rounded-lg border border-[#73aac4]/30 !px-3 !py-1.5 text-xs font-medium text-[#6495e6] transition hover:bg-muted"
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
                                  `Er du sikker på at du vil slette "${gruppe.name}"? Alle medlemskap og meldinger vil bli slettet.`,
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
            </div>
          </section>
        ))}

        {grupper?.length === 0 && (
          <p className="text-center text-muted-foreground !py-8">
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
  availableUsers: {
    id: string;
    name: string;
    email: string | null;
    studieretning: string | null;
  }[];
  onAdd: (userId: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const usersByMajor = new Map<string, typeof availableUsers>();
  for (const user of availableUsers) {
    const key = findMajor(user.studieretning) ?? UKJENT_STUDIERETNING;
    const bucket = usersByMajor.get(key) ?? [];
    bucket.push(user);
    usersByMajor.set(key, bucket);
  }
  const majorOptions = [...usersByMajor.keys()].sort(compareMajorLabels);

  const filtered = availableUsers.filter((u) => {
    const matchesMajor =
      !selectedMajor ||
      (findMajor(u.studieretning) ?? UKJENT_STUDIERETNING) === selectedMajor;
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchesMajor && matchesSearch;
  });

  return (
    <div className="rounded-lg border border-[#73aac4]/30 bg-background !p-4 !space-y-3">
      <p className="text-sm font-medium text-foreground">
        Legg til {role === "FADDER" ? "fadder" : "fadderbarn"}
      </p>

      <div className="flex flex-wrap !gap-1.5">
        <button
          type="button"
          onClick={() => setSelectedMajor(null)}
          className={`rounded-full border !px-2.5 !py-1 text-xs font-medium transition ${
            selectedMajor === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-[#73aac4]/30 text-muted-foreground hover:bg-muted"
          }`}
        >
          Alle ({availableUsers.length})
        </button>
        {majorOptions.map((major) => (
          <button
            key={major}
            type="button"
            onClick={() => {
              setSelectedUserId("");
              setSelectedMajor(selectedMajor === major ? null : major);
            }}
            className={`rounded-full border !px-2.5 !py-1 text-xs font-medium transition ${
              selectedMajor === major
                ? "border-primary bg-primary text-primary-foreground"
                : "border-[#73aac4]/30 text-muted-foreground hover:bg-muted"
            }`}
          >
            {major} ({usersByMajor.get(major)?.length ?? 0})
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Sok etter bruker..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-[#73aac4]/30 bg-background !px-3 !py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#73aac4]"
      />
      <div className="max-h-40 overflow-y-auto !space-y-1">
        {filtered.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => setSelectedUserId(user.id)}
            className={`flex w-full items-center justify-between rounded-lg !px-3 !py-2 text-left text-sm transition ${
              selectedUserId === user.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-xs text-muted-foreground !py-2">
            Ingen tilgjengelige brukere
          </p>
        )}
      </div>
      <div className="flex !gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg !px-3 !py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          Avbryt
        </button>
        <button
          type="button"
          onClick={() => {
            if (selectedUserId) onAdd(selectedUserId);
          }}
          disabled={!selectedUserId || isPending}
          className="rounded-lg bg-primary !px-3 !py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Legg til
        </button>
      </div>
    </div>
  );
}
