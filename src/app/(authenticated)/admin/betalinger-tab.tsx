"use client";

import { ArrowDown, ArrowUp, Download, RefreshCw } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { api, type RouterOutputs } from "~/trpc/react";
import { toast } from "~/components/ui/use-toast";
import { downloadCsv, toCsv, toDateAndTime, type CsvColumn } from "~/lib/csv";

type Registration = RouterOutputs["admin"]["getRegistrations"][number];

type Filter = "alle" | "betalt" | "ubetalt" | "uten-gruppe";
type SortKey = "navn" | "registrert" | "betalt" | "status" | "gruppe";
type SortDir = "asc" | "desc";

/** Statuses that mean the user started paying but never completed it. */
const IN_PROGRESS_STATUSES = ["CREATED", "AUTHORIZED"] as const;

const STATUS_LABELS: Record<string, string> = {
  CREATED: "Påbegynt",
  AUTHORIZED: "Reservert",
  CAPTURED: "Betalt",
  ABORTED: "Avbrutt",
  EXPIRED: "Utløpt",
  TERMINATED: "Terminert",
  FAILED: "Feilet",
};

const STATUS_STYLES: Record<string, string> = {
  CAPTURED: "bg-emerald-500/15 text-emerald-400",
  AUTHORIZED: "bg-sky-500/15 text-sky-400",
  CREATED: "bg-amber-500/15 text-amber-400",
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "betalt", label: "Betalt" },
  { value: "ubetalt", label: "Ikke betalt" },
  { value: "uten-gruppe", label: "Uten faddergruppe" },
];

/** Format øre as Norwegian kroner, e.g. 38000 → "380 kr". */
function kr(ore: number): string {
  return `${(ore / 100).toLocaleString("no-NO")} kr`;
}

function formatDateTime(value: Date | string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("no-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * A user can be marked paid without a captured Vipps order — older records and
 * anyone settled outside the app. Saying "Ikke startet" for them would be wrong,
 * so flag the distinction instead of hiding it.
 */
function statusLabel(status: string | null, hasPaid: boolean): string {
  if (status === "CAPTURED") return STATUS_LABELS.CAPTURED!;
  if (hasPaid) return "Betalt (utenfor Vipps)";
  if (!status) return "Ikke startet";
  return STATUS_LABELS[status] ?? status;
}

function StatusBadge({
  status,
  hasPaid,
}: {
  status: string | null;
  hasPaid: boolean;
}) {
  if (hasPaid && status !== "CAPTURED") {
    return (
      <span className="rounded-full bg-emerald-500/10 !px-2.5 !py-0.5 text-xs font-semibold text-emerald-400/80">
        {statusLabel(status, hasPaid)}
      </span>
    );
  }

  if (!status) {
    return <span className="text-muted-foreground">Ikke startet</span>;
  }
  return (
    <span
      className={`rounded-full !px-2.5 !py-0.5 text-xs font-semibold ${
        STATUS_STYLES[status] ?? "bg-red-500/15 text-red-400"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card !p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="!mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Live Vipps status + event timeline for one order, fetched on expand. */
function PaymentDetails({ orderId }: { orderId: string }) {
  const { data, isLoading, error } = api.admin.getPaymentDetails.useQuery(
    { orderId },
    { retry: false },
  );

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Henter fra Vipps...</p>
    );
  }

  if (error) {
    return <p className="text-sm text-red-400">{error.message}</p>;
  }

  if (!data) return null;

  return (
    <div className="!space-y-3">
      <div className="flex flex-wrap !gap-x-6 !gap-y-1 text-sm">
        <span className="text-muted-foreground">
          Status i Vipps:{" "}
          <span className="font-medium text-foreground">
            {data.snapshot.state}
          </span>
        </span>
        <span className="text-muted-foreground">
          Reservert:{" "}
          <span className="font-medium text-foreground">
            {kr(data.snapshot.authorized)}
          </span>
        </span>
        <span className="text-muted-foreground">
          Trukket:{" "}
          <span className="font-medium text-foreground">
            {kr(data.snapshot.captured)}
          </span>
        </span>
        {data.snapshot.refunded > 0 && (
          <span className="text-muted-foreground">
            Refundert:{" "}
            <span className="font-medium text-foreground">
              {kr(data.snapshot.refunded)}
            </span>
          </span>
        )}
      </div>

      <div className="!space-y-1">
        <p className="text-xs font-semibold text-muted-foreground">
          Hendelseslogg
        </p>
        {data.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen hendelser</p>
        ) : (
          <ul className="!space-y-1">
            {data.events.map((event, i) => (
              <li
                key={`${event.action}-${event.timestamp ?? i}`}
                className="flex flex-wrap items-center !gap-2 text-sm"
              >
                <span
                  className={`font-medium ${
                    event.success ? "text-foreground" : "text-red-400"
                  }`}
                >
                  {STATUS_LABELS[event.action] ?? event.action}
                </span>
                {event.amount != null && (
                  <span className="text-muted-foreground">
                    {kr(event.amount)}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {formatDateTime(event.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function BetalingerTab() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");
  const [sortKey, setSortKey] = useState<SortKey>("registrert");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const utils = api.useUtils();
  const { data: registrations, isLoading } =
    api.admin.getRegistrations.useQuery();
  const { data: price } = api.admin.getPaymentAmount.useQuery();

  const syncMutation = api.admin.syncPayments.useMutation({
    onSuccess: (result) => {
      void utils.admin.getRegistrations.invalidate();
      void utils.admin.getUsers.invalidate();
      toast({
        title: "Synkronisert mot Vipps",
        description: `${result.checked} ordre sjekket, ${result.settled} ble bekreftet betalt${
          result.failed > 0 ? `, ${result.failed} feilet` : ""
        }.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Synk feilet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rows = useMemo(() => registrations ?? [], [registrations]);

  const stats = useMemo(() => {
    const paid = rows.filter((r) => r.hasPaid);
    const unpaid = rows.filter((r) => !r.hasPaid);
    const inProgress = unpaid.filter(
      (r) =>
        r.paymentStatus !== null &&
        (IN_PROGRESS_STATUSES as readonly string[]).includes(r.paymentStatus),
    );
    const collected = paid.reduce((sum, r) => sum + r.amountPaid, 0);
    const amountOre = price?.amountOre ?? 0;

    return {
      total: rows.length,
      paid: paid.length,
      unpaid: unpaid.length,
      inProgress: inProgress.length,
      withoutGroup: rows.filter((r) => !r.gruppe).length,
      collected,
      // Only Vipps-captured orders contribute to `collected`, so say how many
      // that is — the paid count can be higher for users settled elsewhere.
      collectedCount: paid.filter((r) => r.paymentStatus === "CAPTURED").length,
      outstanding: unpaid.length * amountOre,
    };
  }, [rows, price]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matchesFilter = (r: Registration) => {
      if (filter === "betalt") return r.hasPaid;
      if (filter === "ubetalt") return !r.hasPaid;
      if (filter === "uten-gruppe") return !r.gruppe;
      return true;
    };

    const matchesSearch = (r: Registration) =>
      !query ||
      r.name.toLowerCase().includes(query) ||
      (r.email?.toLowerCase().includes(query) ?? false) ||
      (r.orderId?.toLowerCase().includes(query) ?? false);

    const result = rows.filter((r) => matchesFilter(r) && matchesSearch(r));

    const compare = (a: Registration, b: Registration) => {
      switch (sortKey) {
        case "navn":
          return a.name.localeCompare(b.name, "no");
        case "gruppe":
          return (a.gruppe ?? "").localeCompare(b.gruppe ?? "", "no");
        case "status":
          // Paid first when ascending; unpaid users have no meaningful date.
          return Number(a.hasPaid) - Number(b.hasPaid);
        case "betalt":
          return (
            (a.paidAt ? new Date(a.paidAt).getTime() : 0) -
            (b.paidAt ? new Date(b.paidAt).getTime() : 0)
          );
        case "registrert":
        default:
          return (
            new Date(a.registeredAt).getTime() -
            new Date(b.registeredAt).getTime()
          );
      }
    };

    return [...result].sort((a, b) =>
      sortDir === "asc" ? compare(a, b) : compare(b, a),
    );
  }, [rows, search, filter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "navn" || key === "gruppe" ? "asc" : "desc");
    }
  };

  const exportCsv = (data: Registration[], suffix: string) => {
    const columns: CsvColumn<Registration>[] = [
      { header: "Navn", value: (r) => r.name },
      { header: "E-post", value: (r) => r.email },
      { header: "Klasse", value: (r) => r.klasse },
      { header: "Studieretning", value: (r) => r.studieretning },
      { header: "Faddergruppe", value: (r) => r.gruppe },
      {
        header: "Rolle",
        value: (r) =>
          r.rolle === "FADDER"
            ? "Fadder"
            : r.rolle === "FADDERBARN"
              ? "Fadderbarn"
              : "",
      },
      { header: "Verifisert", value: (r) => (r.isVerified ? "Ja" : "Nei") },
      { header: "Betalt", value: (r) => (r.hasPaid ? "Ja" : "Nei") },
      {
        header: "Betalingsstatus",
        value: (r) => statusLabel(r.paymentStatus, r.hasPaid),
      },
      { header: "Beløp (kr)", value: (r) => r.amountPaid / 100 },
      { header: "Påmeldt dato", value: (r) => toDateAndTime(r.registeredAt).date },
      { header: "Påmeldt tid", value: (r) => toDateAndTime(r.registeredAt).time },
      { header: "Betalt dato", value: (r) => toDateAndTime(r.paidAt).date },
      { header: "Betalt tid", value: (r) => toDateAndTime(r.paidAt).time },
      { header: "Vipps-referanse", value: (r) => r.orderId },
    ];

    const today = toDateAndTime(new Date()).date;
    downloadCsv(
      `fadderuka-pameldte-${suffix}-${today}.csv`,
      toCsv(data, columns),
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center !py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-transparent" />
      </div>
    );
  }

  const unpaidRows = rows.filter((r) => !r.hasPaid);

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (
      sortDir === "asc" ? (
        <ArrowUp className="inline h-3 w-3" />
      ) : (
        <ArrowDown className="inline h-3 w-3" />
      )
    ) : null;

  const sortableHeader = (key: SortKey, label: string) => (
    <th className="!px-4 !py-3 font-medium">
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className="inline-flex items-center !gap-1 transition hover:text-foreground"
      >
        {label}
        {sortIndicator(key)}
      </button>
    </th>
  );

  return (
    <div className="!space-y-8">
      {/* Key figures — enough to follow sign-ups and the budget at a glance */}
      <section className="grid grid-cols-2 !gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Påmeldte" value={String(stats.total)} />
        <StatCard label="Betalt" value={String(stats.paid)} />
        <StatCard
          label="Ikke betalt"
          value={String(stats.unpaid)}
          hint={`${stats.inProgress} påbegynt`}
        />
        <StatCard label="Uten gruppe" value={String(stats.withoutGroup)} />
        <StatCard
          label="Innbetalt"
          value={kr(stats.collected)}
          hint={`${stats.collectedCount} via Vipps`}
        />
        <StatCard
          label="Utestående"
          value={kr(stats.outstanding)}
          hint="Hvis alle betaler"
        />
      </section>

      {/* Actions */}
      <section className="flex flex-wrap !gap-2">
        <button
          type="button"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="inline-flex items-center !gap-2 rounded-xl border border-border bg-secondary !px-4 !py-2 text-sm font-semibold text-foreground transition hover:bg-secondary/80 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
          />
          {syncMutation.isPending ? "Synkroniserer..." : "Synk mot Vipps"}
        </button>
        <button
          type="button"
          onClick={() => exportCsv(filtered, "utvalg")}
          className="inline-flex items-center !gap-2 rounded-xl border border-border bg-secondary !px-4 !py-2 text-sm font-semibold text-foreground transition hover:bg-secondary/80"
        >
          <Download className="h-4 w-4" />
          Last ned CSV ({filtered.length})
        </button>
        {filtered.length !== rows.length && (
          <button
            type="button"
            onClick={() => exportCsv(rows, "alle")}
            className="inline-flex items-center !gap-2 rounded-xl !px-3 !py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Last ned alle ({rows.length})
          </button>
        )}
      </section>

      {/* Combined, flat overview — one row per registered user */}
      <section className="!space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Samlet oversikt ({filtered.length})
        </h3>

        <div className="flex flex-wrap items-center !gap-3">
          <input
            type="text"
            placeholder="Søk navn, e-post eller referanse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-xl border border-border bg-background !px-4 !py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
          />
          <div className="flex flex-wrap !gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`rounded-full !px-3 !py-1.5 text-xs font-semibold transition ${
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                {sortableHeader("navn", "Navn")}
                <th className="!px-4 !py-3 font-medium">E-post</th>
                <th className="!px-4 !py-3 font-medium">Klasse</th>
                <th className="!px-4 !py-3 font-medium">Studieretning</th>
                {sortableHeader("gruppe", "Faddergruppe")}
                <th className="!px-4 !py-3 font-medium">Rolle</th>
                {sortableHeader("status", "Betaling")}
                <th className="!px-4 !py-3 font-medium">Beløp</th>
                {sortableHeader("registrert", "Påmeldt")}
                {sortableHeader("betalt", "Betalt")}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <Fragment key={r.id}>
                  <tr
                    onClick={() =>
                      setExpandedId(expandedId === r.id ? null : r.id)
                    }
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="!px-4 !py-3 font-medium text-foreground">
                      {r.name}
                    </td>
                    <td className="!px-4 !py-3 text-muted-foreground">
                      {r.email ?? "—"}
                    </td>
                    <td className="!px-4 !py-3 text-muted-foreground">
                      {r.klasse ?? "—"}
                    </td>
                    <td className="!px-4 !py-3 text-muted-foreground">
                      {r.studieretning ?? "—"}
                    </td>
                    <td className="!px-4 !py-3 text-muted-foreground">
                      {r.gruppe ?? "—"}
                    </td>
                    <td className="!px-4 !py-3 text-muted-foreground">
                      {r.rolle === "FADDER"
                        ? "Fadder"
                        : r.rolle === "FADDERBARN"
                          ? "Fadderbarn"
                          : "—"}
                    </td>
                    <td className="!px-4 !py-3">
                      <StatusBadge status={r.paymentStatus} hasPaid={r.hasPaid} />
                    </td>
                    <td className="!px-4 !py-3 text-muted-foreground">
                      {r.amountPaid > 0 ? kr(r.amountPaid) : "—"}
                    </td>
                    <td className="!px-4 !py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(r.registeredAt)}
                    </td>
                    <td className="!px-4 !py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(r.paidAt)}
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr className="border-b border-border">
                      <td colSpan={10} className="bg-muted/30 !px-4 !py-4">
                        {r.orderId ? (
                          <div className="!space-y-2">
                            <p className="font-mono text-xs text-muted-foreground">
                              {r.orderId}
                              {r.attemptCount > 1 &&
                                ` · ${r.attemptCount} betalingsforsøk`}
                            </p>
                            <PaymentDetails orderId={r.orderId} />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Brukeren har aldri startet en betaling i Vipps.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="!px-4 !py-8 text-center text-muted-foreground"
                  >
                    Ingen påmeldte funnet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Chase list — derived from the same dataset, no extra query */}
      <section className="!space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Har ikke betalt ({unpaidRows.length})
        </h3>

        {unpaidRows.length === 0 ? (
          <p className="rounded-xl border border-border bg-card !px-4 !py-6 text-center text-sm text-muted-foreground">
            Alle påmeldte har betalt
          </p>
        ) : (
          <div className="grid grid-cols-1 !gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unpaidRows.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-amber-500/30 bg-amber-500/5 !p-4"
              >
                <p className="font-medium text-foreground">{r.name}</p>
                <p className="text-sm text-muted-foreground">{r.email ?? "—"}</p>
                <p className="!mt-1 text-xs text-muted-foreground">
                  {r.klasse ?? "Ingen klasse"} · påmeldt{" "}
                  {formatDateTime(r.registeredAt)}
                </p>
                <div className="!mt-2">
                  <StatusBadge status={r.paymentStatus} hasPaid={r.hasPaid} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
