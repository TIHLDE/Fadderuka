"use client";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  RefreshCw,
  Search,
  Undo2,
  Wallet,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminEmptyState } from "~/components/admin/admin-empty-state";
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
import { Card, CardContent } from "~/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { downloadCsv, toCsv, toDateAndTime, type CsvColumn } from "~/lib/csv";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

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
  REFUNDED: "Refundert",
};

const STATUS_STYLES: Record<string, string> = {
  CAPTURED: "bg-success/10 text-success",
  AUTHORIZED: "bg-primary/10 text-primary",
  CREATED: "bg-warning/10 text-warning",
  REFUNDED: "bg-warning/10 text-warning",
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
      <Badge variant="secondary" className="bg-success/10 text-success/80">
        {statusLabel(status, hasPaid)}
      </Badge>
    );
  }

  if (!status) {
    return <span className="text-muted-foreground">Ikke startet</span>;
  }
  return (
    <Badge
      variant="secondary"
      className={STATUS_STYLES[status] ?? "bg-destructive/10 text-destructive"}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

/** Nøkkeltall-kort, som Kvark sin AdminStatCard. */
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
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="text-2xl leading-none">{value}</span>
        {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      </CardContent>
    </Card>
  );
}

/**
 * The refund control. Deliberately two-step and styled as destructive: a refund
 * moves real money out of the TIHLDE account and cannot be undone from here, so
 * the first click only reveals what is about to happen — nothing is sent to
 * Vipps until the admin confirms the amount and the name.
 */
function RefundAction({
  orderId,
  name,
  refundable,
}: {
  orderId: string;
  name: string;
  refundable: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const utils = api.useUtils();

  const refundMutation = api.admin.refundPayment.useMutation({
    onSuccess: (result) => {
      setConfirming(false);
      void utils.admin.getPaymentDetails.invalidate({ orderId });
      void utils.admin.getRegistrations.invalidate();
      void utils.admin.getUsers.invalidate();
      toast("Betalingen er refundert", {
        description: `${kr(result.refunded)} er sendt tilbake til ${result.name}, som nå står som ikke betalt.`,
      });
    },
    onError: (error) => {
      toast.error("Refusjon feilet", { description: error.message });
    },
  });

  return (
    <>
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        <Undo2 />
        Refunder {kr(refundable)}
      </Button>
      <AlertDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!refundMutation.isPending) setConfirming(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Refundere {kr(refundable)} til {name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Dette kan ikke angres. {kr(refundable)} betales tilbake via Vipps
              og trekkes fra TIHLDE sin konto, og {name.split(" ")[0]} blir
              markert som ikke betalt. Skal personen delta likevel, må hen
              betale på nytt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              variant="outline"
              size="default"
              disabled={refundMutation.isPending}
            >
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={refundMutation.isPending}
              onClick={(event) => {
                // Lukk først når Vipps har svart — onSuccess gjør det.
                event.preventDefault();
                refundMutation.mutate({ orderId });
              }}
            >
              <Undo2 />
              {refundMutation.isPending
                ? "Refunderer..."
                : `Ja, refunder ${kr(refundable)}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Live Vipps status + event timeline for one order, fetched on expand. */
function PaymentDetails({ orderId, name }: { orderId: string; name: string }) {
  const { data, isLoading, error } = api.admin.getPaymentDetails.useQuery(
    { orderId },
    { retry: false },
  );

  if (isLoading) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Spinner />
        Henter fra Vipps...
      </p>
    );
  }

  if (error) {
    return <p className="text-destructive text-sm">{error.message}</p>;
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          Status i Vipps:{" "}
          <span className="text-foreground font-medium">
            {data.snapshot.state}
          </span>
        </span>
        <span className="text-muted-foreground">
          Reservert:{" "}
          <span className="text-foreground font-medium">
            {kr(data.snapshot.authorized)}
          </span>
        </span>
        <span className="text-muted-foreground">
          Trukket:{" "}
          <span className="text-foreground font-medium">
            {kr(data.snapshot.captured)}
          </span>
        </span>
        {data.snapshot.refunded > 0 && (
          <span className="text-muted-foreground">
            Refundert:{" "}
            <span className="text-foreground font-medium">
              {kr(data.snapshot.refunded)}
            </span>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs font-medium">
          Hendelseslogg
        </p>
        {data.events.length === 0 ? (
          <p className="text-muted-foreground text-sm">Ingen hendelser</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {data.events.map((event, i) => (
              <li
                key={`${event.action}-${event.timestamp ?? i}`}
                className="flex flex-wrap items-center gap-2 text-sm"
              >
                <span
                  className={`font-medium ${
                    event.success ? "text-foreground" : "text-destructive"
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

      {/* Only offer a refund when Vipps actually holds money we can pay back. */}
      {data.snapshot.captured > data.snapshot.refunded && (
        <RefundAction
          orderId={orderId}
          name={name}
          refundable={data.snapshot.captured - data.snapshot.refunded}
        />
      )}
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
      toast("Synkronisert mot Vipps", {
        description: `${result.checked} ordre sjekket, ${result.settled} ble bekreftet betalt${
          result.failed > 0 ? `, ${result.failed} feilet` : ""
        }.`,
      });
    },
    onError: (error) => {
      toast.error("Synk feilet", { description: error.message });
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
      {
        header: "Påmeldt dato",
        value: (r) => toDateAndTime(r.registeredAt).date,
      },
      {
        header: "Påmeldt tid",
        value: (r) => toDateAndTime(r.registeredAt).time,
      },
      { header: "Betalt dato", value: (r) => toDateAndTime(r.paidAt).date },
      { header: "Betalt tid", value: (r) => toDateAndTime(r.paidAt).time },
      { header: "Vipps-referanse", value: (r) => r.orderId },
    ];

    const today = toDateAndTime(new Date()).date;
    downloadCsv(
      `fadderuka-fadderbarn-${suffix}-${today}.csv`,
      toCsv(data, columns),
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  const unpaidRows = rows.filter((r) => !r.hasPaid);

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (
      sortDir === "asc" ? (
        <ArrowUp className="size-3" />
      ) : (
        <ArrowDown className="size-3" />
      )
    ) : null;

  const sortableHeader = (key: SortKey, label: string) => (
    <TableHead
      aria-sort={
        sortKey === key
          ? sortDir === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
      >
        {label}
        {sortIndicator(key)}
      </button>
    </TableHead>
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Key figures — enough to follow sign-ups and the budget at a glance */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Påmeldte"
          value={String(stats.total)}
          hint="Fadderbarn"
        />
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

      {/* Combined, flat overview — one row per paying registration */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl">Samlet oversikt ({filtered.length})</h2>
          <p className="text-muted-foreground">
            Kun fadderbarn. Admin og faddere er utelatt siden de ikke betaler.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <InputGroup className="w-full max-w-sm">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Søk navn, e-post eller referanse"
              aria-label="Søk i påmeldte"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={filter === f.value ? "default" : "outline"}
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {/* Handlinger på linje med søk og filtre, til høyre over tabellen */}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <RefreshCw
                className={cn(syncMutation.isPending && "animate-spin")}
              />
              {syncMutation.isPending ? "Synkroniserer..." : "Synk mot Vipps"}
            </Button>
            <Button
              variant="outline"
              onClick={() => exportCsv(filtered, "utvalg")}
            >
              <Download />
              CSV ({filtered.length})
            </Button>
            {filtered.length !== rows.length && (
              <Button variant="ghost" onClick={() => exportCsv(rows, "alle")}>
                Alle ({rows.length})
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className={filtered.length > 0 ? "p-0" : undefined}>
            {filtered.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {sortableHeader("navn", "Navn")}
                    <TableHead>Klasse</TableHead>
                    <TableHead>Studieretning</TableHead>
                    {sortableHeader("gruppe", "Faddergruppe")}
                    <TableHead>Rolle</TableHead>
                    {sortableHeader("status", "Betaling")}
                    {sortableHeader("registrert", "Påmeldt")}
                    {sortableHeader("betalt", "Betalt")}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <Fragment key={r.id}>
                      <TableRow
                        onClick={() =>
                          setExpandedId(expandedId === r.id ? null : r.id)
                        }
                        aria-expanded={expandedId === r.id}
                        className="cursor-pointer"
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{r.name}</span>
                            <span className="text-muted-foreground">
                              {r.email ?? "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.klasse ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.studieretning ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.gruppe ?? "—"}
                        </TableCell>
                        <TableCell>
                          {r.rolle === "FADDER" ? (
                            <Badge>Fadder</Badge>
                          ) : r.rolle === "FADDERBARN" ? (
                            <Badge variant="secondary">Fadderbarn</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={r.paymentStatus}
                            hasPaid={r.hasPaid}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDateTime(r.registeredAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDateTime(r.paidAt)}
                        </TableCell>
                      </TableRow>
                      {expandedId === r.id && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            {r.orderId ? (
                              <div className="flex flex-col gap-2">
                                <p className="text-muted-foreground font-mono text-xs">
                                  {r.orderId}
                                  {r.attemptCount > 1 &&
                                    ` · ${r.attemptCount} betalingsforsøk`}
                                </p>
                                <PaymentDetails
                                  orderId={r.orderId}
                                  name={r.name}
                                />
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-sm">
                                Brukeren har aldri startet en betaling i Vipps.
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <AdminEmptyState
                icon={Search}
                title="Ingen påmeldte funnet"
                description="Ingen påmeldte matcher søket eller filteret."
              />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Chase list — derived from the same dataset, no extra query */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Har ikke betalt ({unpaidRows.length})</h2>

        {unpaidRows.length === 0 ? (
          <Card>
            <CardContent>
              <AdminEmptyState
                icon={CheckCircle2}
                title="Alle påmeldte har betalt"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unpaidRows.map((r) => (
              <Card key={r.id} size="sm">
                <CardContent className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 font-medium">
                    <Wallet className="text-warning size-4 shrink-0" />
                    {r.name}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {r.email ?? "—"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {r.klasse ?? "Ingen klasse"} · påmeldt{" "}
                    {formatDateTime(r.registeredAt)}
                  </span>
                  <div className="mt-1">
                    <StatusBadge status={r.paymentStatus} hasPaid={r.hasPaid} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
