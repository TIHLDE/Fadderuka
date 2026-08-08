"use client";

import {
  ChevronDown,
  Shield,
  ShieldOff,
  Trash2,
  UserCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  MAJORS,
  type Major,
  UKJENT_STUDIERETNING,
  compareMajorLabels,
  findMajor,
} from "~/lib/majors";

/**
 * Hva betalingskolonnen viser for én bruker.
 *
 * Kolonnen viste før bare `isFadder` — «Fritatt» eller «Skal betale» — så en
 * fadderbarn som HADDE betalt sto som «Skal betale». Den leses som en status,
 * så nå er den det.
 *
 * Fritak vinner over betaling: en fadder skylder ingenting uansett hva som står
 * i `hasPaid`. Unntaket er fadderen som allerede har betalt — de har penger til
 * gode, og det fortjener en egen tilstand framfor å bli borte bak «Fritatt» til
 * noen tilfeldigvis åpner Betalinger-fanen.
 *
 * Knappen bytter fortsatt fritaket; bare merkelappen er ny. Derfor sier hver
 * hjelpetekst også hva et klikk faktisk gjør.
 */
function betalingsvisning(user: { isFadder: boolean; hasPaid: boolean }) {
  if (user.isFadder && user.hasPaid) {
    return {
      label: "Fritatt · betalt",
      className: "bg-destructive/10 text-destructive hover:bg-destructive/20",
      hint: "Fritatt, men har betalt — pengene skal refunderes fra Betalinger-fanen. Klikk for å gjøre betalingspliktig igjen.",
    };
  }
  if (user.isFadder) {
    return {
      label: "Fritatt",
      className: "bg-muted text-muted-foreground hover:bg-muted/80",
      hint: "Fadder — skylder ingenting. Klikk for å gjøre betalingspliktig.",
    };
  }
  if (user.hasPaid) {
    return {
      label: "Betalt",
      className: "bg-success/10 text-success hover:bg-success/20",
      hint: "Har betalt for fadderuka. Klikk for å frita som fadder.",
    };
  }
  return {
    label: "Ikke betalt",
    className: "bg-warning/10 text-warning hover:bg-warning/20",
    hint: "Har ikke betalt ennå. Klikk for å frita som fadder.",
  };
}

/**
 * Correct the programme TIHLDE reports for a user.
 *
 * Shows the pinned choice when there is one, and otherwise "Følg TIHLDE" with
 * whatever the profile currently says — so it is visible at a glance whether a
 * row is being overridden, and clearing it is one option away.
 */
function StudieVelger({
  studieretning,
  studieretningOverride,
  disabled,
  onChange,
}: {
  studieretning: string | null;
  studieretningOverride: string | null;
  disabled: boolean;
  onChange: (studieretning: Major | null) => void;
}) {
  return (
    <select
      value={studieretningOverride ?? ""}
      disabled={disabled}
      onChange={(e) =>
        onChange(e.target.value === "" ? null : (e.target.value as Major))
      }
      title="Overstyr studieretningen TIHLDE oppgir, f.eks. for en som begynner på Digital transformasjon"
      className="border-border bg-background text-foreground focus:ring-ring max-w-[13rem] rounded-lg border !px-2 !py-1 text-xs transition focus:ring-2 focus:outline-none disabled:opacity-60"
    >
      <option value="">
        Følg TIHLDE{studieretning ? ` (${studieretning})` : ""}
      </option>
      {MAJORS.map((major) => (
        <option key={major} value={major}>
          {major}
        </option>
      ))}
    </select>
  );
}

export function UsersTab() {
  const [search, setSearch] = useState("");
  const [verifyingUserId, setVerifyingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [expandedMajor, setExpandedMajor] = useState<string | null>(null);
  // While searching, every group with a hit opens by itself — collapsing one
  // again is per-group, and the overrides are dropped as soon as the query
  // changes so a new search always starts fully open.
  const [collapsedWhileSearching, setCollapsedWhileSearching] = useState<
    Set<string>
  >(new Set());
  const utils = api.useUtils();

  const { data: users, isLoading } = api.admin.getUsers.useQuery();
  const { data: grupper } = api.admin.getGrupper.useQuery();

  const verifyAndAssignMutation = api.admin.verifyAndAssign.useMutation({
    onSuccess: () => {
      void utils.admin.getUsers.invalidate();
      void utils.admin.getGrupper.invalidate();
      setVerifyingUserId(null);
      toast("Bruker verifisert og lagt til i gruppe som fadderbarn");
    },
    onError: (error) => {
      toast.error("Feil", { description: error.message });
    },
  });

  // Verifisering uten gruppe: brukeren slipper inn med en gang, og dukker opp
  // som kandidat i Faddergrupper-fanen til den skal plasseres.
  const verifyOnlyMutation = api.admin.setUserVerified.useMutation({
    onSuccess: () => {
      void utils.admin.getUsers.invalidate();
      setVerifyingUserId(null);
      toast("Bruker verifisert uten gruppe", {
        description:
          "Legg brukeren i en faddergruppe senere fra Faddergrupper-fanen.",
      });
    },
    onError: (error) => {
      toast.error("Feil", { description: error.message });
    },
  });

  const deleteMutation = api.admin.deleteUser.useMutation({
    onSuccess: () => {
      void utils.admin.getUsers.invalidate();
      setDeletingUserId(null);
      toast("Bruker slettet");
    },
    onError: (error) => {
      toast.error("Feil", { description: error.message });
    },
  });

  const adminMutation = api.admin.setUserAdmin.useMutation({
    onSuccess: () => {
      void utils.admin.getUsers.invalidate();
      toast("Adminstatus oppdatert");
    },
  });

  const fadderMutation = api.admin.setUserFadder.useMutation({
    onSuccess: (result) => {
      void utils.admin.getUsers.invalidate();
      void utils.admin.getRegistrations.invalidate();
      // A fadder who paid before being marked is owed the money back, and the
      // admin is the only one who can start that — so say it here rather than
      // leaving it to be noticed in the payment overview.
      if (result.needsRefund) {
        toast.error(`${result.name} er fritatt — men har allerede betalt`, {
          description: "Refunder betalingen fra Betalinger-fanen.",
        });
      } else {
        // «Betalingsplikt», ikke «betalingsstatus»: bryteren flytter hvem som
        // skylder penger, og rører aldri om noen har betalt.
        toast("Betalingsplikt oppdatert");
      }
    },
    onError: (error) => {
      toast.error("Feil", { description: error.message });
    },
  });

  // «Aktiver»: gir en selvregistrert student en ekte TIHLDE-bruker. Photon har
  // ingen godkjenningskø, så opprettelsen ER aktiveringen.
  const aktiverMutation = api.admin.createTihldeAccount.useMutation({
    onSuccess: (result) => {
      void utils.admin.getUsers.invalidate();
      toast(`${result.username} har fått TIHLDE-bruker`, {
        description: `Studenten setter sitt eget passord med «glemt passord» på tihlde.org. Verifiserings-e-post er sendt til ${result.email}.`,
      });
    },
    onError: (error) => {
      toast.error("Fikk ikke opprettet TIHLDE-bruker", {
        description: error.message,
      });
    },
  });

  const studieMutation = api.admin.setUserStudieretning.useMutation({
    onSuccess: (result, variables) => {
      void utils.admin.getUsers.invalidate();
      void utils.admin.getRegistrations.invalidate();
      toast(
        variables.studieretning
          ? `${result.name} står nå på ${variables.studieretning}`
          : `${result.name} følger TIHLDE igjen`,
        {
          description: variables.studieretning
            ? "Valget overlever innlogging. Betalingsstatus er ikke endret."
            : "Studieretningen hentes fra TIHLDE-profilen ved neste innlogging.",
        },
      );
    },
    onError: (error) => {
      toast.error("Feil", { description: error.message });
    },
  });

  const updateRoleMutation = api.admin.updateMemberRole.useMutation({
    onSuccess: () => {
      void utils.admin.getUsers.invalidate();
      void utils.admin.getGrupper.invalidate();
      toast("Rolle oppdatert");
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
  const isSearching = search.trim().length > 0;
  const studieretninger = [...verifiedByStudieretning.keys()]
    .filter(
      (major) =>
        !isSearching || (verifiedByStudieretning.get(major)?.length ?? 0) > 0,
    )
    .sort(compareMajorLabels);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center !py-12">
        <div className="border-border h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="!space-y-8">
      {/* Unverified users — nedtonet, men fortsatt lett å komme til */}
      <section className="!space-y-3">
        <div className="flex items-center !gap-2">
          <h3 className="text-muted-foreground text-sm font-medium">
            Nye uverifiserte brukere
          </h3>
          {unverifiedUsers.length > 0 && (
            <span className="bg-muted text-muted-foreground rounded-full !px-2 !py-0.5 text-xs font-medium">
              {unverifiedUsers.length}
            </span>
          )}
        </div>

        {unverifiedUsers.length > 0 ? (
          <div className="!space-y-2">
            {unverifiedUsers.map((user) => (
              <div
                key={user.id}
                className="border-border bg-card flex flex-col !gap-3 rounded-xl border !p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-foreground font-medium break-words">
                    {user.name}
                  </p>
                  <p className="text-muted-foreground text-sm break-all">
                    {user.email}
                  </p>
                  <div className="mt-1 flex flex-wrap !gap-1.5">
                    {user.klasse && (
                      <span className="bg-primary/10 text-primary rounded-full !px-2 !py-0.5 text-xs font-medium">
                        {user.klasse}
                      </span>
                    )}
                    {user.studieretning && (
                      <span className="bg-primary/10 text-primary rounded-full !px-2 !py-0.5 text-xs font-medium">
                        {user.studieretning}
                      </span>
                    )}
                    {!user.klasse && !user.studieretning && (
                      <span className="text-muted-foreground text-xs">
                        Ingen klasse/retning oppgitt
                      </span>
                    )}
                  </div>
                  <div className="!mt-2">
                    <StudieVelger
                      studieretning={user.studieretning}
                      studieretningOverride={user.studieretningOverride}
                      disabled={studieMutation.isPending}
                      onChange={(studieretning) =>
                        studieMutation.mutate({
                          userId: user.id,
                          studieretning,
                        })
                      }
                    />
                  </div>
                  <p className="text-muted-foreground !mt-2 text-xs">
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
                    <p className="text-muted-foreground text-xs font-medium">
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
                          disabled={
                            verifyAndAssignMutation.isPending ||
                            verifyOnlyMutation.isPending
                          }
                          className="border-border bg-secondary text-foreground hover:bg-secondary/80 rounded-lg border !px-3 !py-1.5 text-xs font-medium transition disabled:opacity-60"
                        >
                          {gruppe.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          verifyOnlyMutation.mutate({
                            userId: user.id,
                            isVerified: true,
                          })
                        }
                        disabled={
                          verifyAndAssignMutation.isPending ||
                          verifyOnlyMutation.isPending
                        }
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg border border-dashed !px-3 !py-1.5 text-xs font-medium transition disabled:opacity-60"
                      >
                        Uten gruppe
                      </button>
                      <button
                        type="button"
                        onClick={() => setVerifyingUserId(null)}
                        className="text-muted-foreground hover:text-foreground rounded-lg !px-3 !py-1.5 text-xs transition"
                      >
                        Avbryt
                      </button>
                    </div>
                    {(!grupper || grupper.length === 0) && (
                      <p className="text-muted-foreground text-xs sm:text-right">
                        Ingen faddergrupper enda — verifiser «Uten gruppe»,
                        eller opprett en i Faddergrupper-fanen.
                      </p>
                    )}
                  </div>
                ) : deletingUserId === user.id ? (
                  <div className="flex flex-col !gap-2 sm:items-end">
                    <p className="text-destructive text-xs font-medium">
                      Sikker på at du vil slette denne brukeren?
                    </p>
                    <div className="flex flex-wrap !gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          deleteMutation.mutate({ userId: user.id })
                        }
                        disabled={deleteMutation.isPending}
                        className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg border !px-3 !py-1.5 text-xs font-semibold transition disabled:opacity-60"
                      >
                        {deleteMutation.isPending
                          ? "Sletter..."
                          : "Bekreft sletting"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingUserId(null)}
                        className="text-muted-foreground hover:text-foreground rounded-lg !px-3 !py-1.5 text-xs transition"
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Tre knapper får ikke plass på en mobilbredde, så de brekker
                     til neste linje framfor å stikke ut av kortet. */
                  <div className="flex flex-wrap !gap-2 sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => setVerifyingUserId(user.id)}
                      className="border-success/40 bg-success/10 text-success hover:bg-success/20 inline-flex items-center !gap-2 rounded-xl border !px-4 !py-2 text-sm font-semibold transition"
                    >
                      <UserCheck className="h-4 w-4" />
                      Verifiser
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingUserId(user.id)}
                      className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 inline-flex items-center !gap-2 rounded-xl border !px-4 !py-2 text-sm font-semibold transition"
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
          <p className="text-muted-foreground text-sm">
            Ingen uverifiserte brukere
          </p>
        )}
      </section>

      {/* Verified users grouped by studieretning */}
      <section className="!space-y-4">
        <h3 className="text-foreground text-lg font-semibold">
          Verifiserte brukere ({verifiedUsers.length})
        </h3>

        <input
          type="text"
          placeholder="Sok etter bruker..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCollapsedWhileSearching(new Set());
          }}
          className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full max-w-sm rounded-xl border !px-4 !py-2.5 text-sm focus:ring-2 focus:outline-none"
        />

        <div className="!space-y-4">
          {studieretninger.map((studieretning) => {
            const usersInGroup =
              verifiedByStudieretning.get(studieretning) ?? [];
            const isExpanded = isSearching
              ? !collapsedWhileSearching.has(studieretning)
              : expandedMajor === studieretning;
            return (
              <div
                key={studieretning}
                className="border-border bg-card overflow-hidden rounded-xl border"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isSearching) {
                      setCollapsedWhileSearching((prev) => {
                        const next = new Set(prev);
                        if (isExpanded) next.add(studieretning);
                        else next.delete(studieretning);
                        return next;
                      });
                      return;
                    }
                    setExpandedMajor(isExpanded ? null : studieretning);
                  }}
                  className="flex w-full items-center justify-between !gap-3 !p-4 text-left"
                >
                  <div>
                    <p className="text-foreground font-semibold">
                      {studieretning}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {usersInGroup.length}{" "}
                      {usersInGroup.length === 1 ? "bruker" : "brukere"}
                    </p>
                  </div>
                  <span className="flex items-center !gap-2">
                    <span className="bg-primary/10 text-primary rounded-full !px-2.5 !py-0.5 text-sm font-semibold">
                      {usersInGroup.length}
                    </span>
                    <motion.span
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="text-muted-foreground"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.span>
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
                        opacity: { duration: 0.15 },
                      }}
                      className="border-border overflow-hidden border-t"
                    >
                      {/* Se kommentaren i betalinger-tab: min-bredde framfor
                        sammenklemte kolonner, med scroll ut til skjermkanten. */}
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[64rem] text-left text-sm">
                          <thead>
                            <tr className="border-border text-muted-foreground border-b">
                              <th className="!px-4 !py-3 font-medium">Navn</th>
                              <th className="!px-4 !py-3 font-medium">
                                E-post
                              </th>
                              <th className="!px-4 !py-3 font-medium">
                                Klasse
                              </th>
                              <th className="!px-4 !py-3 font-medium">
                                Studie
                              </th>
                              <th className="!px-4 !py-3 font-medium">
                                Gruppe
                              </th>
                              <th className="!px-4 !py-3 font-medium">Rolle</th>
                              {/* Se `betalingsvisning`: viser faktisk status
                              (betalt / ikke betalt), med fritak for faddere. */}
                              <th className="!px-4 !py-3 font-medium">
                                Betaling
                              </th>
                              <th className="!px-4 !py-3 text-center font-medium">
                                Admin
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {usersInGroup.map((user) => {
                              const membership = user.memberships[0];
                              return (
                                <tr
                                  key={user.id}
                                  className="border-border hover:bg-muted/50 border-b last:border-0"
                                >
                                  <td className="text-foreground !px-4 !py-3 font-medium">
                                    {user.name}
                                  </td>
                                  <td className="text-muted-foreground !px-4 !py-3">
                                    {user.email}
                                  </td>
                                  <td className="!px-4 !py-3">
                                    {user.klasse ? (
                                      <span className="bg-primary/10 text-primary rounded-full !px-2 !py-0.5 text-xs font-medium">
                                        {user.klasse}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        —
                                      </span>
                                    )}
                                  </td>
                                  {/* TIHLDE eier studieretningen, men henger etter
                                  for den som begynner på et påbygg som Digital
                                  transformasjon. Da er dette veien inn. */}
                                  <td className="!px-4 !py-3">
                                    <StudieVelger
                                      studieretning={user.studieretning}
                                      studieretningOverride={
                                        user.studieretningOverride
                                      }
                                      disabled={studieMutation.isPending}
                                      onChange={(studieretning) =>
                                        studieMutation.mutate({
                                          userId: user.id,
                                          studieretning,
                                        })
                                      }
                                    />
                                  </td>
                                  <td className="text-muted-foreground !px-4 !py-3">
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
                                      <span className="text-muted-foreground">
                                        —
                                      </span>
                                    )}
                                  </td>
                                  {/* Faddere betaler ikke. Utledes fra kullet, så
                                  denne bryteren er unntaket for tilfellene
                                  regelen ikke ser — og den låser valget. */}
                                  <td className="!px-4 !py-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        fadderMutation.mutate({
                                          userId: user.id,
                                          isFadder: !user.isFadder,
                                        })
                                      }
                                      disabled={fadderMutation.isPending}
                                      className={`rounded-full !px-3 !py-1 text-xs font-semibold transition ${betalingsvisning(user).className}`}
                                      title={betalingsvisning(user).hint}
                                    >
                                      {betalingsvisning(user).label}
                                    </button>
                                    {/* Bare for de som ennå ikke er TIHLDE-
                                    medlemmer. Forsvinner av seg selv når de har
                                    logget inn med TIHLDE, siden det nullstiller
                                    det lokale passordet. */}
                                    {user.harLokalKonto && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          aktiverMutation.mutate({
                                            userId: user.id,
                                          })
                                        }
                                        disabled={aktiverMutation.isPending}
                                        className="bg-primary/10 text-primary hover:bg-primary/20 !ml-2 rounded-full !px-3 !py-1 text-xs font-semibold transition"
                                        title="Oppretter TIHLDE-bruker på tihlde.org. Studenten setter selv passord med «glemt passord» der."
                                      >
                                        Aktiver
                                      </button>
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
                                      className="hover:bg-foreground/10 inline-flex items-center justify-center rounded-lg !p-1.5 transition"
                                      title={
                                        user.isAdmin
                                          ? "Fjern admintilgang"
                                          : "Gi admintilgang"
                                      }
                                    >
                                      {user.isAdmin ? (
                                        <Shield className="text-warning h-4 w-4" />
                                      ) : (
                                        <ShieldOff className="text-muted-foreground h-4 w-4" />
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {usersInGroup.length === 0 && (
                              <tr>
                                <td
                                  colSpan={8}
                                  className="text-muted-foreground !px-4 !py-6 text-center"
                                >
                                  Ingen brukere funnet
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {isSearching && studieretninger.length === 0 && (
            <p className="border-border bg-card text-muted-foreground rounded-xl border !p-4 text-sm">
              Ingen brukere funnet
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
