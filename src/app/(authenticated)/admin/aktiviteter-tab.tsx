"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "~/components/ui/use-toast";
import { DateTimePicker } from "~/components/ui/date-time-picker";
import { stripMarkdown } from "~/lib/utils";

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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(makeEmptyForm);
  const utils = api.useUtils();

  const { data: activities, isLoading } = api.activity.getAll.useQuery();

  const createMutation = api.activity.create.useMutation({
    onSuccess: () => {
      void utils.activity.getAll.invalidate();
      setShowForm(false);
      setForm(makeEmptyForm());
      toast({ title: "Aktivitet opprettet" });
    },
  });

  const updateMutation = api.activity.update.useMutation({
    onSuccess: () => {
      void utils.activity.getAll.invalidate();
      setEditingId(null);
      setForm(makeEmptyForm());
      toast({ title: "Aktivitet oppdatert" });
    },
  });

  const deleteMutation = api.activity.delete.useMutation({
    onSuccess: () => {
      void utils.activity.getAll.invalidate();
      toast({ title: "Aktivitet slettet" });
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

  const openEdit = (activity: NonNullable<typeof activities>[number]) => {
    setEditingId(activity.id);
    setForm({
      title: activity.title,
      description: activity.description,
      location: activity.location,
      imageUrl: activity.imageUrl ?? "",
      date: new Date(activity.date),
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(makeEmptyForm());
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Aktiviteter ({activities?.length ?? 0})
        </h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center !gap-2 rounded-xl border border-[#73aac4]/40 bg-secondary !px-4 !py-2 text-sm font-semibold text-foreground transition hover:bg-secondary/80"
          >
            <Plus className="h-4 w-4" />
            Ny aktivitet
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="!space-y-4 rounded-xl border border-[#73aac4]/30 bg-secondary !p-5"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">
              {editingId ? "Rediger aktivitet" : "Ny aktivitet"}
            </h4>
            <button
              type="button"
              onClick={cancelForm}
              className="text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col !gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tittel *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Navn på aktiviteten"
                className="rounded-lg border border-[#73aac4]/30 bg-background !px-3 !py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#73aac4]"
              />
            </div>
            <div className="flex flex-col !gap-1.5">
              <label
                htmlFor="activity-date"
                className="text-xs font-medium text-muted-foreground"
              >
                Dato og tid *
              </label>
              <DateTimePicker
                id="activity-date"
                value={form.date}
                onChange={(date) => setForm({ ...form, date })}
              />
            </div>
          </div>

          <div className="flex flex-col !gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Sted / kart-lenke *</label>
            <input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="F.eks. Gløshaugen eller https://maps.google.com/..."
              className="rounded-lg border border-[#73aac4]/30 bg-background !px-3 !py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#73aac4]"
            />
          </div>

          <div className="flex flex-col !gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Bilde-URL (valgfritt)</label>
            <input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://..."
              className="rounded-lg border border-[#73aac4]/30 bg-background !px-3 !py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#73aac4]"
            />
          </div>

          <div className="flex flex-col !gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Beskrivelse * <span className="font-normal">(støtter Markdown)</span>
            </label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Beskriv aktiviteten..."
              className="rounded-lg border border-[#73aac4]/30 bg-background !px-3 !py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#73aac4]"
            />
          </div>

          <div className="flex justify-end !gap-3">
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-lg !px-4 !py-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={
                !isValid || createMutation.isPending || updateMutation.isPending
              }
              className="rounded-xl border border-[#73aac4]/40 bg-primary !px-4 !py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editingId ? "Lagre endringer" : "Opprett aktivitet"}
            </button>
          </div>
        </form>
      )}

      {activities && activities.length > 0 ? (
        <div className="!space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex flex-col !gap-3 rounded-xl border border-[#73aac4]/20 bg-[color:var(--surface-soft)] !p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex !gap-4">
                {activity.imageUrl ? (
                  <img
                    src={activity.imageUrl}
                    alt={activity.title}
                    className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-900/60 to-blue-900/60">
                    <span className="text-xs font-bold text-sky-300">
                      {activity.title.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="!space-y-1">
                  <p className="font-semibold text-foreground">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.date).toLocaleDateString("no-NO", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <div className="flex items-center !gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="max-w-xs truncate">{activity.location}</span>
                  </div>
                  <p className="max-w-sm text-xs text-muted-foreground line-clamp-2">{stripMarkdown(activity.description)}</p>
                </div>
              </div>

              <div className="flex items-center !gap-2 sm:flex-shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(activity)}
                  className="inline-flex items-center !gap-1.5 rounded-lg border border-[#73aac4]/30 bg-secondary !px-3 !py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary/80"
                >
                  <Pencil className="h-3 w-3" />
                  Rediger
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate({ id: activity.id })}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center !gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 !px-3 !py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-60"
                >
                  <Trash2 className="h-3 w-3" />
                  Slett
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-[#73aac4]/20 bg-[color:var(--surface-soft)] !px-4 !py-6 text-center text-sm text-muted-foreground">
          Ingen aktiviteter lagt til ennå
        </p>
      )}
    </div>
  );
}
