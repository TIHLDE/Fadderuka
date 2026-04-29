"use client";

import { Shield, ShieldOff, Trash2, UserCheck } from "lucide-react";
import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "~/components/ui/use-toast";

export function UsersTab() {
  const [search, setSearch] = useState("");
  const [verifyingUserId, setVerifyingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const utils = api.useUtils();

  const { data: users, isLoading } = api.admin.getUsers.useQuery();
  const { data: grupper } = api.admin.getGrupper.useQuery();

  const verifyAndAssignMutation = api.admin.verifyAndAssign.useMutation({
    onSuccess: () => {
      void utils.admin.getUsers.invalidate();
      void utils.admin.getGrupper.invalidate();
      setVerifyingUserId(null);
      toast({ title: "Bruker verifisert og lagt til i gruppe som fadderbarn" });
    },
  });

  const deleteMutation = api.admin.deleteUser.useMutation({
    onSuccess: () => {
      void utils.admin.getUsers.invalidate();
      setDeletingUserId(null);
      toast({ title: "Bruker slettet" });
    },
    onError: (error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  const adminMutation = api.admin.setUserAdmin.useMutation({
    onSuccess: () => {
      void utils.admin.getUsers.invalidate();
      toast({ title: "Adminstatus oppdatert" });
    },
  });

  const updateRoleMutation = api.admin.updateMemberRole.useMutation({
    onSuccess: () => {
      void utils.admin.getUsers.invalidate();
      void utils.admin.getGrupper.invalidate();
      toast({ title: "Rolle oppdatert" });
    },
  });

  const unverifiedUsers = users?.filter((u) => !u.isVerified) ?? [];
  const verifiedUsers = users?.filter((u) => u.isVerified) ?? [];

  const filteredVerified = verifiedUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center !py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#73aac4] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="!space-y-8">
      {/* Unverified users section */}
      <section className="!space-y-4">
        <div className="flex items-center !gap-3">
          <h3 className="text-lg font-semibold text-white">
            Nye uverifiserte brukere
          </h3>
          {unverifiedUsers.length > 0 && (
            <span className="rounded-full bg-amber-500/20 !px-2.5 !py-0.5 text-xs font-semibold text-amber-400">
              {unverifiedUsers.length}
            </span>
          )}
        </div>

        {unverifiedUsers.length > 0 ? (
          <div className="!space-y-3">
            {unverifiedUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col !gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 !p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{user.name}</p>
                  <p className="text-sm text-[#8694b4]">{user.email}</p>
                  <div className="mt-1 flex flex-wrap !gap-1.5">
                    {user.klasse && (
                      <span className="rounded-full bg-[#73aac4]/15 !px-2 !py-0.5 text-xs font-medium text-[#73aac4]">
                        {user.klasse}
                      </span>
                    )}
                    {user.studieretning && (
                      <span className="rounded-full bg-[#6495e6]/15 !px-2 !py-0.5 text-xs font-medium text-[#6495e6]">
                        {user.studieretning}
                      </span>
                    )}
                    {!user.klasse && !user.studieretning && (
                      <span className="text-xs text-[#5b6a8f]">Ingen klasse/retning oppgitt</span>
                    )}
                  </div>
                  <p className="text-xs text-[#5b6a8f]">
                    Registrert{" "}
                    {new Date(user.createdAt).toLocaleDateString("no-NO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {verifyingUserId === user.id ? (
                  <div className="flex flex-col !gap-2 sm:items-end">
                    <p className="text-xs font-medium text-[#8694b4]">
                      Velg faddergruppe:
                    </p>
                    <div className="flex flex-wrap !gap-2">
                      {grupper?.map((gruppe) => (
                        <button
                          key={gruppe.id}
                          type="button"
                          onClick={() =>
                            verifyAndAssignMutation.mutate({
                              userId: user.id,
                              gruppeId: gruppe.id,
                            })
                          }
                          disabled={verifyAndAssignMutation.isPending}
                          className="rounded-lg border border-[#73aac4]/40 bg-[#212d49] !px-3 !py-1.5 text-xs font-medium text-white transition hover:bg-[#29385a] disabled:opacity-60"
                        >
                          {gruppe.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setVerifyingUserId(null)}
                        className="rounded-lg !px-3 !py-1.5 text-xs text-[#8694b4] hover:text-white transition"
                      >
                        Avbryt
                      </button>
                    </div>
                    {(!grupper || grupper.length === 0) && (
                      <p className="text-xs text-red-400">
                        Opprett en faddergruppe forst (i Faddergrupper-fanen)
                      </p>
                    )}
                  </div>
                ) : deletingUserId === user.id ? (
                  <div className="flex flex-col !gap-2 sm:items-end">
                    <p className="text-xs font-medium text-red-400">
                      Sikker på at du vil slette denne brukeren?
                    </p>
                    <div className="flex !gap-2">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate({ userId: user.id })}
                        disabled={deleteMutation.isPending}
                        className="rounded-lg border border-red-500/40 bg-red-500/10 !px-3 !py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-60"
                      >
                        {deleteMutation.isPending ? "Sletter..." : "Bekreft sletting"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingUserId(null)}
                        className="rounded-lg !px-3 !py-1.5 text-xs text-[#8694b4] transition hover:text-white"
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex !gap-2">
                    <button
                      type="button"
                      onClick={() => setVerifyingUserId(user.id)}
                      className="inline-flex items-center !gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 !px-4 !py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                    >
                      <UserCheck className="h-4 w-4" />
                      Verifiser
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingUserId(user.id)}
                      className="inline-flex items-center !gap-2 rounded-xl border border-red-500/40 bg-red-500/10 !px-4 !py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      Slett
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-[#73aac4]/20 bg-[color:var(--surface-soft)] !px-4 !py-6 text-center text-sm text-[#5b6a8f]">
            Ingen uverifiserte brukere
          </p>
        )}
      </section>

      {/* Verified users table */}
      <section className="!space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Verifiserte brukere ({verifiedUsers.length})
        </h3>

        <input
          type="text"
          placeholder="Sok etter bruker..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-[#73aac4]/40 bg-[#111a2f] !px-4 !py-2.5 text-sm text-white placeholder:text-[#5b6a8f] focus:outline-none focus:ring-2 focus:ring-[#73aac4]"
        />

        <div className="overflow-x-auto rounded-xl border border-[#73aac4]/40 bg-[color:var(--surface-soft)] backdrop-blur">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#73aac4]/20 text-[#8694b4]">
                <th className="!px-4 !py-3 font-medium">Navn</th>
                <th className="!px-4 !py-3 font-medium">E-post</th>
                <th className="!px-4 !py-3 font-medium">Klasse</th>
                <th className="!px-4 !py-3 font-medium">Studieretning</th>
                <th className="!px-4 !py-3 font-medium">Gruppe</th>
                <th className="!px-4 !py-3 font-medium">Rolle</th>
                <th className="!px-4 !py-3 font-medium text-center">Admin</th>
              </tr>
            </thead>
            <tbody>
              {filteredVerified.map((user) => {
                const membership = user.memberships[0];
                return (
                  <tr
                    key={user.id}
                    className="border-b border-[#73aac4]/10 last:border-0 hover:bg-[#1a2540]/50"
                  >
                    <td className="!px-4 !py-3 font-medium text-white">
                      {user.name}
                    </td>
                    <td className="!px-4 !py-3 text-[#8694b4]">
                      {user.email}
                    </td>
                    <td className="!px-4 !py-3">
                      {user.klasse ? (
                        <span className="rounded-full bg-[#73aac4]/15 !px-2 !py-0.5 text-xs font-medium text-[#73aac4]">
                          {user.klasse}
                        </span>
                      ) : (
                        <span className="text-[#5b6a8f]">—</span>
                      )}
                    </td>
                    <td className="!px-4 !py-3">
                      {user.studieretning ? (
                        <span className="rounded-full bg-[#6495e6]/15 !px-2 !py-0.5 text-xs font-medium text-[#6495e6]">
                          {user.studieretning}
                        </span>
                      ) : (
                        <span className="text-[#5b6a8f]">—</span>
                      )}
                    </td>
                    <td className="!px-4 !py-3 text-[#8694b4]">
                      {membership ? membership.gruppe.name : "—"}
                    </td>
                    <td className="!px-4 !py-3">
                      {membership ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateRoleMutation.mutate({
                              membershipId: membership.id,
                              role:
                                membership.role === "FADDER"
                                  ? "FADDERBARN"
                                  : "FADDER",
                            })
                          }
                          disabled={updateRoleMutation.isPending}
                          className={`rounded-full !px-3 !py-1 text-xs font-semibold transition ${
                            membership.role === "FADDER"
                              ? "bg-[#90dfed]/15 text-[#90dfed] hover:bg-[#90dfed]/25"
                              : "bg-[#6495e6]/15 text-[#6495e6] hover:bg-[#6495e6]/25"
                          }`}
                          title={
                            membership.role === "FADDER"
                              ? "Klikk for a endre til fadderbarn"
                              : "Klikk for a endre til fadder"
                          }
                        >
                          {membership.role === "FADDER"
                            ? "Fadder"
                            : "Fadderbarn"}
                        </button>
                      ) : (
                        <span className="text-[#5b6a8f]">—</span>
                      )}
                    </td>
                    <td className="!px-4 !py-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          adminMutation.mutate({
                            userId: user.id,
                            isAdmin: !user.isAdmin,
                          })
                        }
                        disabled={adminMutation.isPending}
                        className="inline-flex items-center justify-center rounded-lg !p-1.5 transition hover:bg-white/10"
                        title={
                          user.isAdmin
                            ? "Fjern admintilgang"
                            : "Gi admintilgang"
                        }
                      >
                        {user.isAdmin ? (
                          <Shield className="h-4 w-4 text-amber-400" />
                        ) : (
                          <ShieldOff className="h-4 w-4 text-[#5b6a8f]" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredVerified.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="!px-4 !py-8 text-center text-[#8694b4]"
                  >
                    Ingen brukere funnet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
