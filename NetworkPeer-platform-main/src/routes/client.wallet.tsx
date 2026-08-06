import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Download, FileText, Plus, Wallet } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/shell/portal-shell";
import { Chip, SectionCard, StatCard } from "@/components/marketplace/primitives";
import { transactions } from "@/lib/mock-data";

export const Route = createFileRoute("/client/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet & invoices — NetworkPeers client" },
      {
        name: "description",
        content:
          "Track escrow holds, spend, transactions and downloadable invoices for your NetworkPeers jobs.",
      },
      { property: "og:title", content: "Wallet & invoices — NetworkPeers client" },
      { property: "og:description", content: "Escrow, spend and invoices in one place." },
    ],
  }),
  component: ClientWallet,
});

const invoices = [
  { id: "INV-2026-118", period: "July 2026", amount: 486.5, status: "Due Aug 5" },
  { id: "INV-2026-102", period: "June 2026", amount: 1204.0, status: "Paid" },
  { id: "INV-2026-087", period: "May 2026", amount: 942.25, status: "Paid" },
];

function ClientWallet() {
  return (
    <>
      <PageHeader
        title="Wallet"
        description="Escrow balance, spend history and invoices"
        action={
          <button className="press gradient-brand shadow-glow inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-base font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Top up
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Available balance"
          value={formatCurrency(1284)}
          icon={Wallet}
          delta={8}
          hint="ready to spend"
        />
        <StatCard
          label="Held in escrow"
          value={formatCurrency(312)}
          icon={ArrowUpRight}
          tone="warning"
          hint="4 active jobs"
        />
        <StatCard
          label="Spent this month"
          value={formatCurrency(486)}
          icon={ArrowDownLeft}
          tone="teal"
          delta={-4}
        />
        <StatCard
          label="Pending earnings back"
          value={formatCurrency(62)}
          icon={ArrowDownLeft}
          tone="success"
          hint="refunds clearing"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SectionCard
          title="Transactions"
          description="Escrow holds, payouts and top-ups"
          action={
            <button className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-base font-medium">
              <Download className="h-4 w-4" /> Export
            </button>
          }
        >
          <ul className="divide-y divide-border">
            {transactions.map((t) => (
              <li
                key={t.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl",
                    t.amount >= 0 ? "bg-success/20 text-success" : "bg-muted text-muted-foreground",
                  )}
                >
                  {t.amount >= 0 ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-medium">{t.label}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {t.ref} · {t.date}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-base font-semibold tabular-nums",
                      t.amount >= 0 && "text-success",
                    )}
                  >
                    {t.amount >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(t.amount))}
                  </p>
                  {t.type === "pending" && <Chip tone="warning">Escrow</Chip>}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Payment method">
            <div className="gradient-brand shadow-glow rounded-2xl p-5 text-primary-foreground">
              <p className="text-sm opacity-80">Primary card</p>
              <p className="mt-6 text-xl font-semibold tracking-widest">•••• •••• •••• 4421</p>
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] text-sm opacity-90">
                <span>Verified Client</span>
                <span>09 / 29</span>
              </div>
            </div>
            <button className="press mt-3 h-10 w-full rounded-xl border border-border bg-card text-base font-semibold">
              Manage payment methods
            </button>
          </SectionCard>

          <SectionCard title="Invoices">
            <ul className="space-y-3">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border p-3"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium">{inv.id}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {inv.period} · {formatCurrency(inv.amount)}
                    </p>
                  </div>
                  <Chip tone={inv.status === "Paid" ? "success" : "warning"}>{inv.status}</Chip>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
