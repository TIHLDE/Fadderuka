"use client";

import { KeyRound, Shield, ShieldOff, Trash2, UserCheck } from "lucide-react";
import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "~/components/ui/use-toast";
import {
  MAJORS,
  UKJENT_STUDIERETNING,
  compareMajorLabels,
  findMajor,
} from "~/lib/majors";

export function UsersTab() {
  const [search, setSearch] = useState("");
  const [verifyingUserId, setVerifyingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [expandedMajor, setExpandedMajor] = useState<string | null>(null);
  // Engangspassordet vises kun i denne økten – det kan ikke hentes fram igjen.
  const [tempPassword, setTempPassword] = useState<{
    userId: string;
    tihldeUserId: string;
    password: string;
  } | null>(null);
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

  const resetPasswordMutation = api.admin.resetUserPassword.useMutation({
    onSuccess: (data, variables) => {
      setTempPassword({ userId: variables.userId, ...data });
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
      (u.email?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  const verifiedByStudieretning = new Map<string, typeof filteredVerified>();
  for (const major of MAJORS) verifiedByStudieretning.set(major, []);
  for (const user of filteredVerified) {
    const key = findMajor(user.studieretning) ?? UKJENT_STUDIERETNING;
    const group = verifiedByStudieretning.get(key) ?? [];
    group.push(user);
    verifiedByStudieretning.set(key, group);
  }
  const studieretninger = [...verifiedByStudieretning.keys()].sort(
    compareMajorLabels,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center !py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="!space-y-8">
      {/* Unverified users section */}
      <section className="!space-y-4">
        <div className="flex items-center !gap-3">
          <h3 className="text-lg font-semibold text-foreground">
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
                className="flex flex-col !gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 !p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="mt-1 flex flex-wrap !gap-1.5">
                    {user.klasse && (
                      <span className="rounded-full bg-primary/10 !px-2 !py-0.5 text-xs font-medium text-primary">
                        {user.klasse}
                      </span>
                    )}
                    {user.studieretning && (
                      <span className="rounded-full bg-primary/10 !px-2 !py-0.5 text-xs font-medium text-primary">
                        {user.studieretning}
                      </span>
                    )}
                    {!user.klasse && !user.studieretning && (
                      <span className="text-xs text-muted-foreground">Ingen klasse/retning oppgitt</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Registrert{" "}
                    {new Date(user.createdAt).toLocaleDateString("no-NO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {tempPassword?.userId === user.id ? (
                  <div className="flex flex-col !gap-2 sm:items-end">
                    <p className="text-xs font-medium text-foreground">
                      Gi disse til brukeren – passordet vises kun nå:
                    </p>
                    <code className="rounded-lg border border-border bg-background !px-3 !py-2 text-sm font-semibold text-foreground">
                      {tempPassword.tihldeUserId} / {tempPassword.password}
                    </code>
                    <p className="max-w-xs text-xs text-muted-foreground sm:text-right">
                      Gjelder kun her, fram til kontoen godkjennes på tihlde.org.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTempPassword(null)}
                      className="rounded-lg !px-3 !py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
                    >
                      Lukk
                    </button>
                  </div>
                ) : verifyingUserId === user.id ? (
                  <div className="flex flex-col !gap-2 sm:items-end">
                    <p className="text-xs font-medium text-muted-foreground">
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
                          className="rounded-lg border border-border bg-secondary !px-3 !py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary/80 disabled:opacity-60"
                        >
                          {gruppe.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setVerifyingUserId(null)}
                        className="rounded-lg !px-3 !py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
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
                        className="rounded-lg !px-3 !py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
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
                      onClick={() =>
                        resetPasswordMutation.mutate({ userId: user.id })
                      }
                      disabled={resetPasswordMutation.isPending}
                      title="Lag et engangspassord for innlogging her, i påvente av godkjenning på tihlde.org"
                      className="inline-flex items-center !gap-2 rounded-xl border border-border bg-secondary !px-4 !py-2 text-sm font-semibold text-foreground transition hover:bg-secondary/80 disabled:opacity-60"
                    >
                      <KeyRound className="h-4 w-4" />
                      Engangspassord
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
          <p className="rounded-xl border border-border bg-card !px-4 !py-6 text-center text-sm text-muted-foreground">
            Ingen uverifiserte brukere
          </p>
        )}
      </section>

      {/* Verified users grouped by studieretning */}
      <section className="!space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Verifiserte brukere ({verifiedUsers.length})
        </h3>

        <input
          type="text"
          placeholder="Sok etter bruker..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-border bg-background !px-4 !py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="grid grid-cols-1 !gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studieretninger.map((studieretning) => {
            const usersInGroup = verifiedByStudieretning.get(studieretning) ?? [];
            const isExpanded = expandedMajor === studieretning;
            return (
              <div
                key={studieretning}
                className={`rounded-xl border bg-card transition ${
                  isExpanded
                    ? "border-border sm:col-span-2 lg:col-span-3"
                    : "border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedMajor(isExpanded ? null : studieretning)
                  }
                  className="flex w-full items-center justify-between !gap-3 !p-4 text-left"
                >
                  <div>
                    <p className="font-semibold text-foreground">{studieretning}</p>
                    <p className="text-xs text-muted-foreground">
                      {usersInGroup.length}{" "}
                      {usersInGroup.length === 1 ? "bruker" : "brukere"}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 !px-2.5 !py-0.5 text-sm font-semibold text-primary">
                    {usersInGroup.length}
                  </span>
                </button>

                {isExpanded && (
                  <div className="overflow-x-auto border-t border-border">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="!px-4 !py-3 font-medium">Navn</th>
                          <th className="!px-4 !py-3 font-medium">E-post</th>
                          <th className="!px-4 !py-3 font-medium">Klasse</th>
                          <th className="!px-4 !py-3 font-medium">Gruppe</th>
                          <th className="!px-4 !py-3 font-medium">Rolle</th>
                          <th className="!px-4 !py-3 font-medium text-center">Admin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersInGroup.map((user) => {
                          const membership = user.memberships[0];
                          return (
                            <tr
                              key={user.id}
                              className="border-b border-border last:border-0 hover:bg-muted/50"
                            >
                              <td className="!px-4 !py-3 font-medium text-foreground">
                                {user.name}
                              </td>
                              <td className="!px-4 !py-3 text-muted-foreground">
                                {user.email}
                              </td>
                              <td className="!px-4 !py-3">
                                {user.klasse ? (
                                  <span className="rounded-full bg-primary/10 !px-2 !py-0.5 text-xs font-medium text-primary">
                                    {user.klasse}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="!px-4 !py-3 text-muted-foreground">
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
                                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                                        : "bg-primary/10 text-primary hover:bg-primary/20"
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
                                  <span className="text-muted-foreground">—</span>
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
                                  className="inline-flex items-center justify-center rounded-lg !p-1.5 transition hover:bg-foreground/10"
                                  title={
                                    user.isAdmin
                                      ? "Fjern admintilgang"
                                      : "Gi admintilgang"
                                  }
                                >
                                  {user.isAdmin ? (
                                    <Shield className="h-4 w-4 text-amber-400" />
                                  ) : (
                                    <ShieldOff className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {usersInGroup.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="!px-4 !py-6 text-center text-muted-foreground"
                            >
                              Ingen brukere funnet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
