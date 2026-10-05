"use client";

import {
  Eye,
  EyeOff,
  Plus,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import type { FormEvent } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Spinner } from "~/components/ui/spinner";
import {
  compareMajorLabels,
  findMajor,
  UKJENT_STUDIERETNING,
} from "~/lib/majors";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { TIME_ZONE } from "~/lib/date";

type Gruppe = RouterOutputs["admin"]["getGrupper"][number];
type Member = Gruppe["members"][number];
type Role = "FADDER" | "FADDERBARN";

/** A gruppe only ever holds students of one major; derive it from its members. */
function gruppeMajor(gruppe: Gruppe): string {
  for (const member of gruppe.members) {
    const major = findMajor(member.user.studieretning);
    if (major) return major;
  }
  return UKJENT_STUDIERETNING;
}

export function GrupperTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const [newGruppeName, setNewGruppeName] = useState("");
  const [addMemberState, setAddMemberState] = useState<{
    gruppe: Gruppe;
    role: Role;
  } | null>(null);
  const confirmDelete = usePendingConfirm<Gruppe>();

  const utils = api.useUtils();

  const { data: grupper, isLoading } = api.admin.getGrupper.useQuery();
  const { data: users } = api.admin.getUsers.useQuery();

  const createMutation = api.admin.createGruppe.useMutation({
    onSuccess: () => {
      void utils.admin.getGrupper.invalidate();
      setNewGruppeName("");
      setCreateOpen(false);
      toast("Faddergruppe opprettet");
    },
  });

  const deleteMutation = api.admin.deleteGruppe.useMutation({
    onSuccess: () => {
      void utils.admin.getGrupper.invalidate();
      confirmDelete.clear();
      toast("Faddergruppe slettet");
    },
  });

  const addMemberMutation = api.admin.addMember.useMutation({
    onSuccess: () => {
      void utils.admin.getGrupper.invalidate();
      void utils.admin.getUsers.invalidate();
      setAddMemberState(null);
      toast("Medlem lagt til");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const removeMemberMutation = api.admin.removeMember.useMutation({
    onSuccess: () => {
      void utils.admin.getGrupper.invalidate();
      void utils.admin.getUsers.invalidate();
      toast("Medlem fjernet");
    },
  });

  const updateRoleMutation = api.admin.updateMemberRole.useMutation({
    onSuccess: () => {
      void utils.admin.getGrupper.invalidate();
      void utils.admin.getUsers.invalidate();
      toast("Rolle oppdatert");
    },
  });

  const handleCreateGruppe = (e: FormEvent) => {
    e.preventDefault();
    if (!newGruppeName.trim()) return;
    createMutation.mutate({ name: newGruppeName.trim() });
  };

  // Verified users who are not in a faddergruppe at all. A user belongs to
  // exactly one group, so someone already placed elsewhere must be removed
  // from that group before they can be added here.
  const availableUsers =
    users?.filter((u) => u.isVerified && u.memberships.length === 0) ?? [];

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
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PublicationBanner />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-2xl">Faddergrupper ({grupper?.length ?? 0})</h2>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Ny faddergruppe
        </Button>
      </div>

      {grupper?.length === 0 ? (
        <Card>
          <CardContent>
            <AdminEmptyState
              icon={Users}
              title="Ingen faddergrupper"
              description="Ingen faddergrupper er opprettet ennå. Opprett en for å begynne å plassere faddere og fadderbarn."
            />
          </CardContent>
        </Card>
      ) : (
        groupsByMajor.map(([major, grupperIMajor]) => (
          <section key={major} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg">{major}</h3>
              <Badge variant="secondary">
                {grupperIMajor.length}{" "}
                {grupperIMajor.length === 1 ? "gruppe" : "grupper"}
              </Badge>
            </div>
            <Accordion className="gap-4">
              {grupperIMajor.map((gruppe) => {
                const faddere = gruppe.members.filter(
                  (m) => m.role === "FADDER",
                );
                const fadderbarn = gruppe.members.filter(
                  (m) => m.role === "FADDERBARN",
                );

                return (
                  <Card key={gruppe.id} className="py-0">
                    <AccordionItem value={gruppe.id} className="border-0">
                      <AccordionTrigger className="items-center px-4 py-4 hover:no-underline">
                        <span className="flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <span className="text-base">{gruppe.name}</span>
                          <span className="text-muted-foreground flex gap-2 text-xs font-normal">
                            <Badge>{faddere.length} faddere</Badge>
                            <Badge variant="secondary">
                              {fadderbarn.length} fadderbarn
                            </Badge>
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="flex flex-col gap-4 border-t p-4">
                          {/* Faddere og fadderbarn i hver sin spalte, så det
                              alltid er tydelig hvem som er hva. */}
                          <div className="grid gap-4 md:grid-cols-2">
                            <MemberList
                              title="Faddere"
                              members={faddere}
                              emptyText="Ingen faddere enda"
                              switchLabel="Til fadderbarn"
                              onSwitchRole={(member) =>
                                updateRoleMutation.mutate({
                                  membershipId: member.id,
                                  role: "FADDERBARN",
                                })
                              }
                              onRemove={(member) =>
                                removeMemberMutation.mutate({
                                  membershipId: member.id,
                                })
                              }
                              onAdd={() =>
                                setAddMemberState({ gruppe, role: "FADDER" })
                              }
                              addLabel="Legg til fadder"
                            />
                            <MemberList
                              title="Fadderbarn"
                              members={fadderbarn}
                              emptyText="Ingen fadderbarn enda"
                              switchLabel="Til fadder"
                              onSwitchRole={(member) =>
                                updateRoleMutation.mutate({
                                  membershipId: member.id,
                                  role: "FADDER",
                                })
                              }
                              onRemove={(member) =>
                                removeMemberMutation.mutate({
                                  membershipId: member.id,
                                })
                              }
                              onAdd={() =>
                                setAddMemberState({
                                  gruppe,
                                  role: "FADDERBARN",
                                })
                              }
                              addLabel="Legg til fadderbarn"
                            />
                          </div>

                          <div className="flex justify-end border-t pt-3">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => confirmDelete.request(gruppe)}
                            >
                              <Trash2 />
                              Slett gruppe
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Card>
                );
              })}
            </Accordion>
          </section>
        ))
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setNewGruppeName("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateGruppe} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Ny faddergruppe</DialogTitle>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="ny-gruppe-navn">Navn</FieldLabel>
              <Input
                id="ny-gruppe-navn"
                placeholder="F.eks. Gruppe Blå"
                value={newGruppeName}
                onChange={(e) => setNewGruppeName(e.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !newGruppeName.trim()}
              >
                Opprett
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AddMemberDialog
        state={addMemberState}
        availableUsers={availableUsers}
        isPending={addMemberMutation.isPending}
        onAdd={(userId) => {
          if (!addMemberState) return;
          addMemberMutation.mutate({
            userId,
            gruppeId: addMemberState.gruppe.id,
            role: addMemberState.role,
          });
        }}
        onClose={() => setAddMemberState(null)}
      />

      <ConfirmDeleteDialog
        open={confirmDelete.open}
        onOpenChange={(open) => {
          if (!open) confirmDelete.clear();
        }}
        title={`Slette «${confirmDelete.shown?.name ?? ""}»?`}
        description="Alle medlemskap og meldinger i gruppa blir slettet. Dette kan ikke angres."
        confirmLabel="Slett gruppe"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (confirmDelete.pending) {
            deleteMutation.mutate({ gruppeId: confirmDelete.pending.id });
          }
        }}
      />
    </div>
  );
}

function MemberList({
  title,
  members,
  emptyText,
  switchLabel,
  onSwitchRole,
  onRemove,
  onAdd,
  addLabel,
}: {
  title: string;
  members: Member[];
  emptyText: string;
  switchLabel: string;
  onSwitchRole: (member: Member) => void;
  onRemove: (member: Member) => void;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium">
          {title} ({members.length})
        </h4>
        <Button variant="outline" size="xs" onClick={onAdd}>
          <UserPlus />
          {addLabel}
        </Button>
      </div>
      {members.length > 0 ? (
        <ul className="flex flex-col">
          {members.map((member) => (
            <li
              key={member.id}
              className="hover:bg-muted/50 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5"
            >
              {/* E-postene er lange nok til å skyve knappene ut av kortet på
                  mobil, så navn og e-post legger seg under hverandre. */}
              <div className="flex min-w-0 flex-col">
                <span className="text-sm">{member.user.name}</span>
                <span className="text-muted-foreground text-xs break-all">
                  {member.user.email}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => onSwitchRole(member)}
                >
                  {switchLabel}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Fjern ${member.user.name} fra gruppa`}
                  title="Fjern fra gruppa"
                  onClick={() => onRemove(member)}
                >
                  <UserMinus className="text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground px-2 text-sm">{emptyText}</p>
      )}
    </div>
  );
}

/**
 * Bryteren som slipper faddergruppene til fadderbarna — alle på én gang.
 *
 * Ligger øverst i fanen fordi den er statusen man vil se før man rører noe
 * annet: er gruppene fortsatt hemmelige, eller er de ute?
 */
function PublicationBanner() {
  const utils = api.useUtils();
  const { data, isLoading } = api.admin.getGruppePublication.useQuery();
  const [confirmHide, setConfirmHide] = useState(false);

  const setPublication = api.admin.setGruppePublication.useMutation({
    onSuccess: (result) => {
      void utils.admin.getGruppePublication.invalidate();
      setConfirmHide(false);
      toast(
        result.published
          ? "Faddergruppene er publisert"
          : "Faddergruppene er skjult igjen",
      );
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (isLoading || !data) return null;

  const { published, publishedAt } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {published ? (
            <Eye className="text-primary size-4" />
          ) : (
            <EyeOff className="text-muted-foreground size-4" />
          )}
          {published
            ? "Faddergruppene er publisert"
            : "Faddergruppene er skjult"}
        </CardTitle>
        <CardDescription className="max-w-xl">
          {published
            ? `Fadderbarna ser gruppa si, medlemmene og meldingene. Publisert ${formatDateTime(publishedAt)}.`
            : "Fadderbarna ser hverken gruppa, medlemmene eller meldingene. Faddere og admins ser alt hele tiden."}
        </CardDescription>
        <CardAction>
          {published ? (
            <Button
              variant="outline"
              disabled={setPublication.isPending}
              onClick={() => setConfirmHide(true)}
            >
              <EyeOff />
              Skjul igjen
            </Button>
          ) : (
            <Button
              disabled={setPublication.isPending}
              onClick={() => setPublication.mutate({ published: true })}
            >
              <Eye />
              Publiser til fadderbarna
            </Button>
          )}
        </CardAction>
      </CardHeader>

      <AlertDialog open={confirmHide} onOpenChange={setConfirmHide}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skjule faddergruppene igjen?</AlertDialogTitle>
            <AlertDialogDescription>
              Fadderbarna mister tilgangen til gruppa si, medlemmene og
              meldingene til du publiserer på nytt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" size="default">
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={setPublication.isPending}
              onClick={() => setPublication.mutate({ published: false })}
            >
              Skjul gruppene
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/** Dato på norsk format, eller «—» når tidspunktet mangler. */
function formatDateTime(value: Date | string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("no-NO", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type AvailableUser = {
  id: string;
  name: string;
  email: string | null;
  studieretning: string | null;
};

function AddMemberDialog({
  state,
  availableUsers,
  onAdd,
  onClose,
  isPending,
}: {
  state: { gruppe: Gruppe; role: Role } | null;
  availableUsers: AvailableUser[];
  onAdd: (userId: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const reset = () => {
    setSelectedUserId("");
    setSelectedMajor(null);
    setSearch("");
  };

  const usersByMajor = new Map<string, AvailableUser[]>();
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

  const roleLabel = state?.role === "FADDER" ? "fadder" : "fadderbarn";

  return (
    <Dialog
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Legg til {roleLabel} i {state?.gruppe.name}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="xs"
              variant={selectedMajor === null ? "default" : "outline"}
              onClick={() => {
                setSelectedUserId("");
                setSelectedMajor(null);
              }}
            >
              Alle ({availableUsers.length})
            </Button>
            {majorOptions.map((major) => (
              <Button
                key={major}
                size="xs"
                variant={selectedMajor === major ? "default" : "outline"}
                onClick={() => {
                  setSelectedUserId("");
                  setSelectedMajor(selectedMajor === major ? null : major);
                }}
              >
                {major} ({usersByMajor.get(major)?.length ?? 0})
              </Button>
            ))}
          </div>

          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Søk etter navn eller e-post"
              aria-label="Søk etter bruker"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>

          <div
            role="listbox"
            aria-label="Tilgjengelige brukere"
            className="flex max-h-56 flex-col gap-1 overflow-y-auto"
          >
            {filtered.map((user) => {
              const selected = selectedUserId === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => setSelectedUserId(user.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <span>{user.name}</span>
                  <span
                    className={cn(
                      "truncate text-xs",
                      selected
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground",
                    )}
                  >
                    {user.email}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Ingen tilgjengelige brukere. Brukere som allerede er i en
                faddergruppe må fjernes derfra først.
              </p>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              reset();
            }}
          >
            Avbryt
          </Button>
          <Button
            disabled={!selectedUserId || isPending}
            onClick={() => {
              if (selectedUserId) {
                onAdd(selectedUserId);
                reset();
              }
            }}
          >
            Legg til
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
