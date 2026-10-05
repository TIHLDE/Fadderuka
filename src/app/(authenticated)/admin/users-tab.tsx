"use client";

import { Search, Trash2, UserCheck, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminEmptyState } from "~/components/admin/admin-empty-state";
import {
  ConfirmDeleteDialog,
  usePendingConfirm,
} from "~/components/admin/confirm-delete-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { Switch } from "~/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  MAJORS,
  type Major,
  UKJENT_STUDIERETNING,
  compareMajorLabels,
  findMajor,
} from "~/lib/majors";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import { TIME_ZONE } from "~/lib/date";

type AdminUser = RouterOutputs["admin"]["getUsers"][number];

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

/** Select-verdien for «følg TIHLDE» — Base UI sin Select trenger en streng. */
const FOLG_TIHLDE = "__folg-tihlde__";

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
  const folgLabel = `Følg TIHLDE${studieretning ? ` (${studieretning})` : ""}`;

  return (
    <Select
      value={studieretningOverride ?? FOLG_TIHLDE}
      disabled={disabled}
      onValueChange={(value) =>
        onChange(value === FOLG_TIHLDE ? null : (value as Major))
      }
    >
      <SelectTrigger
        size="sm"
        className="max-w-56"
        title="Overstyr studieretningen TIHLDE oppgir, f.eks. for en som begynner på Digital transformasjon"
      >
        <SelectValue>
          {(value) => (value === FOLG_TIHLDE ? folgLabel : (value as string))}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={FOLG_TIHLDE}>{folgLabel}</SelectItem>
        {MAJORS.map((major) => (
          <SelectItem key={major} value={major}>
            {major}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** En liten statusbryter med badge-utseende — klikk bytter tilstanden. */
function BadgeToggle({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <Badge
      variant="secondary"
      render={<button type="button" {...props} />}
      className={cn("cursor-pointer disabled:opacity-60", className)}
    />
  );
}

export function UsersTab() {
  const [search, setSearch] = useState("");
  const [verifying, setVerifying] = useState<AdminUser | null>(null);
  // Tom streng = «Uten gruppe», og det er med vilje utgangspunktet: å verifisere
  // er det viktige, plasseringen kan komme senere fra Faddergrupper-fanen.
  const [valgtGruppeId, setValgtGruppeId] = useState("");
  /** Åpner (eller lukker) verifiseringsdialogen, alltid med gruppevalget nullstilt. */
  const settVerifisering = (user: AdminUser | null) => {
    setVerifying(user);
    setValgtGruppeId("");
  };
  const confirmDelete = usePendingConfirm<AdminUser>();
  // Studieretningene som er slått opp. Et søk åpner alle med treff; å lukke en
  // igjen gjelder til søket endres.
  const [openMajors, setOpenMajors] = useState<string[]>([]);
  const utils = api.useUtils();

  const { data: users, isLoading } = api.admin.getUsers.useQuery();
  const { data: grupper } = api.admin.getGrupper.useQuery();

  const verifyAndAssignMutation = api.admin.verifyAndAssign.useMutation({
    onSuccess: () => {
      void utils.admin.getUsers.invalidate();
      void utils.admin.getGrupper.invalidate();
      settVerifisering(null);
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
      settVerifisering(null);
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
      confirmDelete.clear();
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

  const verifiseringPagar =
    verifyAndAssignMutation.isPending || verifyOnlyMutation.isPending;

  const unverifiedUsers = users?.filter((u) => !u.isVerified) ?? [];
  const verifiedUsers = users?.filter((u) => u.isVerified) ?? [];

  const matchesSearch = (u: AdminUser, query: string) =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    (u.email?.toLowerCase().includes(query.toLowerCase()) ?? false);

  const groupByMajor = (list: AdminUser[]) => {
    const grouped = new Map<string, AdminUser[]>();
    for (const major of MAJORS) grouped.set(major, []);
    for (const user of list) {
      const key = findMajor(user.studieretning) ?? UKJENT_STUDIERETNING;
      const group = grouped.get(key) ?? [];
      group.push(user);
      grouped.set(key, group);
    }
    return grouped;
  };

  const verifiedByStudieretning = groupByMajor(
    verifiedUsers.filter((u) => matchesSearch(u, search)),
  );
  const isSearching = search.trim().length > 0;
  const studieretninger = [...verifiedByStudieretning.keys()]
    .filter(
      (major) =>
        !isSearching || (verifiedByStudieretning.get(major)?.length ?? 0) > 0,
    )
    .sort(compareMajorLabels);

  const handleSearch = (value: string) => {
    setSearch(value);
    // Et nytt søk starter alltid helt åpent: alle studieretninger med treff
    // slås opp. Tomt søk lukker alt igjen, som før.
    if (value.trim().length === 0) {
      setOpenMajors([]);
      return;
    }
    const hits = groupByMajor(
      verifiedUsers.filter((u) => matchesSearch(u, value)),
    );
    setOpenMajors(
      [...hits.entries()]
        .filter(([, list]) => list.length > 0)
        .map(([major]) => major),
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl">Nye uverifiserte brukere</h2>
          {unverifiedUsers.length > 0 && (
            <Badge variant="secondary">{unverifiedUsers.length}</Badge>
          )}
        </div>

        <Card>
          <CardContent
            className={unverifiedUsers.length > 0 ? "p-0" : undefined}
          >
            {unverifiedUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Navn</TableHead>
                    <TableHead>Klasse og retning</TableHead>
                    <TableHead>Studie</TableHead>
                    <TableHead>Registrert</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unverifiedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {user.klasse && (
                            <Badge variant="secondary">{user.klasse}</Badge>
                          )}
                          {user.studieretning && (
                            <Badge variant="secondary">
                              {user.studieretning}
                            </Badge>
                          )}
                          {!user.klasse && !user.studieretning && (
                            <span className="text-muted-foreground">
                              Ingen klasse/retning oppgitt
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("no-NO", {
                          timeZone: TIME_ZONE,
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => settVerifisering(user)}
                          >
                            <UserCheck />
                            Verifiser
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Slett ${user.name}`}
                            onClick={() => confirmDelete.request(user)}
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <AdminEmptyState
                icon={UserCheck}
                title="Ingen uverifiserte brukere"
                description="Nye brukere som ikke har betalt eller blitt verifisert dukker opp her."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="text-2xl">
            Verifiserte brukere ({verifiedUsers.length})
          </h2>
          <InputGroup className="w-full max-w-sm">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Søk etter navn eller e-post"
              aria-label="Søk etter bruker"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </InputGroup>
        </div>

        {isSearching && studieretninger.length === 0 ? (
          <Card>
            <CardContent>
              <AdminEmptyState
                icon={Search}
                title="Ingen brukere funnet"
                description={`Ingen verifiserte brukere matcher «${search}».`}
              />
            </CardContent>
          </Card>
        ) : (
          <Accordion
            multiple
            value={openMajors}
            onValueChange={(value) => setOpenMajors(value as string[])}
            className="gap-4"
          >
            {studieretninger.map((studieretning) => {
              const usersInGroup =
                verifiedByStudieretning.get(studieretning) ?? [];
              return (
                <Card key={studieretning} className="py-0">
                  <AccordionItem value={studieretning} className="border-0">
                    <AccordionTrigger className="items-center px-4 py-4 hover:no-underline">
                      <span className="flex flex-1 items-center justify-between gap-3">
                        <span className="flex flex-col">
                          <span className="text-base">{studieretning}</span>
                          <span className="text-muted-foreground text-xs font-normal">
                            {usersInGroup.length}{" "}
                            {usersInGroup.length === 1 ? "bruker" : "brukere"}
                          </span>
                        </span>
                        <Badge variant="secondary">{usersInGroup.length}</Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <div className="border-t">
                        <UserTable
                          users={usersInGroup}
                          studieMutation={studieMutation}
                          updateRoleMutation={updateRoleMutation}
                          fadderMutation={fadderMutation}
                          aktiverMutation={aktiverMutation}
                          adminMutation={adminMutation}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Card>
              );
            })}
          </Accordion>
        )}
      </section>

      <Dialog
        open={verifying !== null}
        onOpenChange={(open) => {
          if (!open) settVerifisering(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verifiser {verifying?.name}</DialogTitle>
            <DialogDescription>
              Brukeren slipper inn i appen så snart du verifiserer.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="verifiser-gruppe">Faddergruppe</FieldLabel>
            <Select
              value={valgtGruppeId}
              onValueChange={(value) => setValgtGruppeId(value ?? "")}
              disabled={verifiseringPagar}
            >
              <SelectTrigger id="verifiser-gruppe" className="w-full">
                <SelectValue>
                  {(value) =>
                    value
                      ? (grupper?.find((g) => g.id === value)?.name ?? "")
                      : "Uten gruppe"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Uten gruppe</SelectItem>
                {grupper?.map((gruppe) => (
                  <SelectItem key={gruppe.id} value={gruppe.id}>
                    {gruppe.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {valgtGruppeId
                ? "Brukeren blir lagt til som fadderbarn i gruppa."
                : "Brukeren slipper inn nå, og kan plasseres i en gruppe senere."}
            </FieldDescription>
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => settVerifisering(null)}
            >
              Avbryt
            </Button>
            <Button
              disabled={verifiseringPagar || !verifying}
              onClick={() => {
                if (!verifying) return;
                if (valgtGruppeId) {
                  verifyAndAssignMutation.mutate({
                    userId: verifying.id,
                    gruppeId: valgtGruppeId,
                  });
                } else {
                  verifyOnlyMutation.mutate({
                    userId: verifying.id,
                    isVerified: true,
                  });
                }
              }}
            >
              {verifiseringPagar ? "Verifiserer..." : "Verifiser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={confirmDelete.open}
        onOpenChange={(open) => {
          if (!open) confirmDelete.clear();
        }}
        title={`Slette ${confirmDelete.shown?.name ?? ""}?`}
        description="Brukeren og alt som hører til den forsvinner fra fadderuka-siden. Dette kan ikke angres."
        confirmLabel="Slett bruker"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (confirmDelete.pending) {
            deleteMutation.mutate({ userId: confirmDelete.pending.id });
          }
        }}
      />
    </div>
  );
}

type MutationLike<TVars> = {
  mutate: (vars: TVars) => void;
  isPending: boolean;
};

function UserTable({
  users,
  studieMutation,
  updateRoleMutation,
  fadderMutation,
  aktiverMutation,
  adminMutation,
}: {
  users: AdminUser[];
  studieMutation: MutationLike<{ userId: string; studieretning: Major | null }>;
  updateRoleMutation: MutationLike<{
    membershipId: string;
    role: "FADDER" | "FADDERBARN";
  }>;
  fadderMutation: MutationLike<{ userId: string; isFadder: boolean }>;
  aktiverMutation: MutationLike<{ userId: string }>;
  adminMutation: MutationLike<{ userId: string; isAdmin: boolean }>;
}) {
  if (users.length === 0) {
    return (
      <AdminEmptyState
        icon={Users}
        title="Ingen brukere"
        description="Ingen verifiserte brukere på denne studieretningen ennå."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Navn</TableHead>
          <TableHead>Klasse</TableHead>
          <TableHead>Studie</TableHead>
          <TableHead>Gruppe</TableHead>
          <TableHead>Rolle</TableHead>
          {/* Se `betalingsvisning`: viser faktisk status (betalt / ikke
              betalt), med fritak for faddere. */}
          <TableHead>Betaling</TableHead>
          <TableHead className="text-center">Admin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const membership = user.memberships[0];
          const betaling = betalingsvisning(user);
          return (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-muted-foreground">{user.email}</span>
                </div>
              </TableCell>
              <TableCell>
                {user.klasse ? (
                  <Badge variant="secondary">{user.klasse}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              {/* TIHLDE eier studieretningen, men henger etter for den som
                  begynner på et påbygg som Digital transformasjon. Da er dette
                  veien inn. */}
              <TableCell>
                <StudieVelger
                  studieretning={user.studieretning}
                  studieretningOverride={user.studieretningOverride}
                  disabled={studieMutation.isPending}
                  onChange={(studieretning) =>
                    studieMutation.mutate({ userId: user.id, studieretning })
                  }
                />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {membership ? membership.gruppe.name : "—"}
              </TableCell>
              <TableCell>
                {membership ? (
                  <BadgeToggle
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
                    className={
                      membership.role === "FADDER"
                        ? "bg-primary text-primary-foreground hover:bg-primary/80"
                        : undefined
                    }
                    title={
                      membership.role === "FADDER"
                        ? "Klikk for å endre til fadderbarn"
                        : "Klikk for å endre til fadder"
                    }
                  >
                    {membership.role === "FADDER" ? "Fadder" : "Fadderbarn"}
                  </BadgeToggle>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              {/* Faddere betaler ikke. Utledes fra kullet, så denne bryteren er
                  unntaket for tilfellene regelen ikke ser — og den låser
                  valget. */}
              <TableCell>
                <div className="flex items-center gap-2">
                  <BadgeToggle
                    onClick={() =>
                      fadderMutation.mutate({
                        userId: user.id,
                        isFadder: !user.isFadder,
                      })
                    }
                    disabled={fadderMutation.isPending}
                    className={betaling.className}
                    title={betaling.hint}
                  >
                    {betaling.label}
                  </BadgeToggle>
                  {/* Bare for de som ennå ikke er TIHLDE-medlemmer. Forsvinner
                      av seg selv når de har logget inn med TIHLDE, siden det
                      nullstiller det lokale passordet. */}
                  {user.harLokalKonto && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() =>
                        aktiverMutation.mutate({ userId: user.id })
                      }
                      disabled={aktiverMutation.isPending}
                      title="Oppretter TIHLDE-bruker på tihlde.org. Studenten setter selv passord med «glemt passord» der."
                    >
                      Aktiver
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={user.isAdmin}
                  onCheckedChange={(checked) =>
                    adminMutation.mutate({ userId: user.id, isAdmin: checked })
                  }
                  disabled={adminMutation.isPending}
                  aria-label={
                    user.isAdmin
                      ? `Fjern admintilgang for ${user.name}`
                      : `Gi admintilgang til ${user.name}`
                  }
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
