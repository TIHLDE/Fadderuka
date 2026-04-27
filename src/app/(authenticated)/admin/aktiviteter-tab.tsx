"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "~/components/ui/use-toast";

type FormState = {
  title: string;
  description: string;
  location: string;
  imageUrl: string;
  date: string;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  location: "",
  imageUrl: "",
  date: "",
};

export function AktiviteterTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const utils = api.useUtils();

  const { data: activities, isLoading } = api.activity.getAll.useQuery();

  const createMutation = api.activity.create.useMutation({
    onSuccess: () => {
      void utils.activity.getAll.invalidate();
      setShowForm(false);
      setForm(emptyForm);
      toast({ title: "Aktivitet opprettet" });
    },
  });

  const updateMutation = api.activity.update.useMutation({
    onSuccess: () => {
      void utils.activity.getAll.invalidate();
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: "Aktivitet oppdatert" });
    },
  });

  const deleteMutation = api.activity.delete.useMutation({
    onSuccess: () => {
      void utils.activity.getAll.invalidate();
      toast({ title: "Aktivitet slettet" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      description: form.description,
      location: form.location,
      imageUrl: form.imageUrl || undefined,
      date: new Date(form.date).toISOString(),
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
      date: new Date(activity.date).toISOString().slice(0, 16),
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
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
        <h3 className="text-lg font-semibold text-white">
          Aktiviteter ({activities?.length ?? 0})
        </h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center !gap-2 rounded-xl border border-[#73aac4]/40 bg-[#1a2540] !px-4 !py-2 text-sm font-semibold text-white transition hover:bg-[#29385a]"
          >
            <Plus className="h-4 w-4" />
            Ny aktivitet
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="!space-y-4 rounded-xl border border-[#73aac4]/30 bg-[#1a2540] !p-5"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-white">
              {editingId ? "Rediger aktivitet" : "Ny aktivitet"}
            </h4>
            <button
              type="button"
              onClick={cancelForm}
              className="text-[#8694b4] transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col !gap-1.5">
              <label className="text-xs font-medium text-[#8694b4]">Tittel *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Navn på aktiviteten"
                className="rounded-lg border border-[#73aac4]/30 bg-[#111a2f] !px-3 !py-2 text-sm text-white placeholder:text-[#5b6a8f] focus:outline-none focus:ring-2 focus:ring-[#73aac4]"
              />
            </div>
            <div className="flex flex-col !gap-1.5">
              <label className="text-xs font-medium text-[#8694b4]">Dato og tid *</label>
              <input
                required
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="rounded-lg border border-[#73aac4]/30 bg-[#111a2f] !px-3 !py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#73aac4] [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex flex-col !gap-1.5">
            <label className="text-xs font-medium text-[#8694b4]">Sted / kart-lenke *</label>
            <input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="F.eks. Gløshaugen eller https://maps.google.com/..."
              className="rounded-lg border border-[#73aac4]/30 bg-[#111a2f] !px-3 !py-2 text-sm text-white placeholder:text-[#5b6a8f] focus:outline-none focus:ring-2 focus:ring-[#73aac4]"
            />
          </div>

          <div className="flex flex-col !gap-1.5">
            <label className="text-xs font-medium text-[#8694b4]">Bilde-URL (valgfritt)</label>
            <input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://..."
              className="rounded-lg border border-[#73aac4]/30 bg-[#111a2f] !px-3 !py-2 text-sm text-white placeholder:text-[#5b6a8f] focus:outline-none focus:ring-2 focus:ring-[#73aac4]"
            />
          </div>

          <div className="flex flex-col !gap-1.5">
            <label className="text-xs font-medium text-[#8694b4]">Beskrivelse *</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Beskriv aktiviteten..."
              className="rounded-lg border border-[#73aac4]/30 bg-[#111a2f] !px-3 !py-2 text-sm text-white placeholder:text-[#5b6a8f] focus:outline-none focus:ring-2 focus:ring-[#73aac4]"
            />
          </div>

          <div className="flex justify-end !gap-3">
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-lg !px-4 !py-2 text-sm text-[#8694b4] transition hover:text-white"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-xl border border-[#73aac4]/40 bg-[#73aac4]/20 !px-4 !py-2 text-sm font-semibold text-white transition hover:bg-[#73aac4]/30 disabled:opacity-60"
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
                  <p className="font-semibold text-white">{activity.title}</p>
                  <p className="text-xs text-[#8694b4]">
                    {new Date(activity.date).toLocaleDateString("no-NO", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <div className="flex items-center !gap-1 text-xs text-[#5b6a8f]">
                    <MapPin className="h-3 w-3" />
                    <span className="max-w-xs truncate">{activity.location}</span>
                  </div>
                  <p className="max-w-sm text-xs text-[#8694b4] line-clamp-2">{activity.description}</p>
                </div>
              </div>

              <div className="flex items-center !gap-2 sm:flex-shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(activity)}
                  className="inline-flex items-center !gap-1.5 rounded-lg border border-[#73aac4]/30 bg-[#1a2540] !px-3 !py-1.5 text-xs font-medium text-white transition hover:bg-[#29385a]"
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
        <p className="rounded-xl border border-[#73aac4]/20 bg-[color:var(--surface-soft)] !px-4 !py-6 text-center text-sm text-[#5b6a8f]">
          Ingen aktiviteter lagt til ennå
        </p>
      )}
    </div>
  );
}
