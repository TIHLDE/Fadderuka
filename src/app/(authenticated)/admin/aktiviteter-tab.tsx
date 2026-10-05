"use client";

import { CalendarDays, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminEmptyState } from "~/components/admin/admin-empty-state";
import {
  ConfirmDeleteDialog,
  usePendingConfirm,
} from "~/components/admin/confirm-delete-dialog";
import { ActivityImage } from "~/components/ui/activity-image";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { DateTimePicker } from "~/components/ui/date-time-picker";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { api, type RouterOutputs } from "~/trpc/react";
import { TIME_ZONE } from "~/lib/date";

type Activity = RouterOutputs["activity"]["getAll"][number];

type FormState = {
  title: string;
  description: string;
  location: string;
  imageUrl: string;
  date: Date | undefined;
};

/** Fresh form with the date pre-filled to today at 18:00 — the common case. */
function makeEmptyForm(): FormState {
  const date = new Date();
  date.setHours(18, 0, 0, 0);
  return { title: "", description: "", location: "", imageUrl: "", date };
}

export function AktiviteterTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(makeEmptyForm);
  const confirmDelete = usePendingConfirm<Activity>();
  const utils = api.useUtils();

  const { data: activities, isLoading } = api.activity.getAll.useQuery();

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(makeEmptyForm());
  };

  const createMutation = api.activity.create.useMutation({
    onSuccess: () => {
      void utils.activity.getAll.invalidate();
      closeDialog();
      toast("Aktivitet opprettet");
    },
  });

  const updateMutation = api.activity.update.useMutation({
    onSuccess: () => {
      void utils.activity.getAll.invalidate();
      closeDialog();
      toast("Aktivitet oppdatert");
    },
  });

  const deleteMutation = api.activity.delete.useMutation({
    onSuccess: () => {
      void utils.activity.getAll.invalidate();
      confirmDelete.clear();
      toast("Aktivitet slettet");
    },
  });

  const isValid =
    form.title.trim().length > 0 &&
    form.location.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.date instanceof Date &&
    !Number.isNaN(form.date.getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !form.date) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
      date: form.date.toISOString(),
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(makeEmptyForm());
    setDialogOpen(true);
  };

  const openEdit = (activity: Activity) => {
    setEditingId(activity.id);
    setForm({
      title: activity.title,
      description: activity.description,
      location: activity.location,
      imageUrl: activity.imageUrl ?? "",
      date: new Date(activity.date),
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-2xl">Aktiviteter ({activities?.length ?? 0})</h2>
        <Button onClick={openCreate}>
          <Plus />
          Ny aktivitet
        </Button>
      </div>

      <Card>
        <CardContent className={activities?.length ? "p-0" : undefined}>
          {activities && activities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aktivitet</TableHead>
                  <TableHead>Tidspunkt</TableHead>
                  <TableHead>Sted</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ActivityImage
                          src={activity.imageUrl}
                          alt=""
                          className="aspect-[21/9] w-20 shrink-0 rounded-md object-cover"
                        />
                        <span className="font-medium">{activity.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground flex items-center gap-2">
                        <CalendarDays className="size-4 shrink-0" />
                        {new Date(activity.date).toLocaleDateString("no-NO", {
                          timeZone: TIME_ZONE,
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground flex max-w-56 items-center gap-2">
                        <MapPin className="size-4 shrink-0" />
                        <span className="truncate">{activity.location}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(activity)}
                        >
                          <Pencil />
                          Rediger
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Slett ${activity.title}`}
                          onClick={() => confirmDelete.request(activity)}
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
              icon={CalendarDays}
              title="Ingen aktiviteter"
              description="Ingen aktiviteter er lagt til ennå. Opprett en for å vise den på forsiden og aktivitetssida."
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-auto flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Rediger aktivitet" : "Ny aktivitet"}
              </DialogTitle>
            </DialogHeader>
            <DialogBody>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="activity-title">Tittel</FieldLabel>
                    <Input
                      id="activity-title"
                      required
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      placeholder="Navn på aktiviteten"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="activity-date">Dato og tid</FieldLabel>
                    <DateTimePicker
                      id="activity-date"
                      value={form.date}
                      onChange={(date) => setForm({ ...form, date })}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="activity-location">
                    Sted eller kartlenke
                  </FieldLabel>
                  <Input
                    id="activity-location"
                    required
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    placeholder="F.eks. Gløshaugen eller https://maps.google.com/..."
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="activity-image">
                    Bilde-URL (valgfritt)
                  </FieldLabel>
                  <Input
                    id="activity-image"
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm({ ...form, imageUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="activity-description">
                    Beskrivelse
                  </FieldLabel>
                  <Textarea
                    id="activity-description"
                    required
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Beskriv aktiviteten..."
                  />
                  <FieldDescription>Støtter Markdown.</FieldDescription>
                </Field>
              </FieldGroup>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={
                  !isValid ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
              >
                {editingId ? "Lagre endringer" : "Opprett aktivitet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={confirmDelete.open}
        onOpenChange={(open) => {
          if (!open) confirmDelete.clear();
        }}
        title={`Slette «${confirmDelete.shown?.title ?? ""}»?`}
        description="Aktiviteten forsvinner fra forsiden og aktivitetssida. Dette kan ikke angres."
        confirmLabel="Slett aktivitet"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (confirmDelete.pending) {
            deleteMutation.mutate({ id: confirmDelete.pending.id });
          }
        }}
      />
    </div>
  );
}
