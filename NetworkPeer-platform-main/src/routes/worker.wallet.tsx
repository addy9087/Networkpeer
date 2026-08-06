import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CircleDollarSign,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Plus,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/shell/portal-shell";
import { cn, formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/worker/wallet")({
  head: () => ({
    meta: [
      { title: "Worker wallet — NetworkPeers" },
      { name: "description", content: "Wallet, pending earnings and payout history for workers." },
    ],
  }),
  component: WorkerWallet,
});

const summaryCards = [
  {
    title: "Available Balance",
    amount: 312,
    subtitle: "Ready to withdraw",
    icon: Wallet,
    tone: "primary",
  },
  {
    title: "Pending Earnings",
    amount: 120,
    subtitle: "Held in escrow",
    icon: ArrowUpRight,
    tone: "warning",
  },
  {
    title: "Total Earnings",
    amount: 2640,
    subtitle: "Earned this year",
    icon: CreditCard,
    tone: "success",
  },
] as const;

const transactions = [
  { id: "t1", label: "GF-1042 payout", date: "Jul 28", amount: 78, status: "Completed" },
  { id: "t2", label: "GF-1041 hold", date: "Jul 24", amount: 120, status: "Escrow" },
  { id: "t3", label: "GF-1038 payout", date: "Jul 20", amount: 145, status: "Refunded" },
] as const;

const activityItems = [
  { title: "Payment released", detail: "Yesterday", amount: "₹1,250" },
  { title: "Escrow created", detail: "Today", amount: "₹450" },
  { title: "Proof verified", detail: "Today", amount: "₹220" },
] as const;

const taxDocs = [
  { title: "June statement", meta: "PDF • 2.4 MB", month: "June 2026" },
  { title: "Quarterly payout report", meta: "PDF • 1.1 MB", month: "Q2 2026" },
] as const;

function WorkerWallet() {
  return (
    <div className="animate-rise space-y-4 px-3 py-3">
      <PageHeader
        title="Wallet"
        description="Track balances, payouts and your latest earnings activity."
        action={
          <button
            className="press gradient-brand shadow-glow inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            disabled
          >
            <Plus className="h-4 w-4" /> Withdraw
          </button>
        }
      />

      <div className="worker-compact-grid grid grid-cols-1 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={cn(
                "worker-compact-card flex min-h-[128px] w-full flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift",
                card.tone === "warning" && "bg-warning/10",
                card.tone === "success" && "bg-success/10",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="mt-2 whitespace-nowrap text-2xl font-semibold tracking-tight sm:text-[1.5rem]">
                    {formatCurrency(card.amount)}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{card.subtitle}</p>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="worker-compact-grid flex flex-col gap-3">
        <div className="worker-compact-card rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Monthly earnings</p>
              <p className="mt-1 text-sm text-muted-foreground">Steady growth this month</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">
              <BarChart3 className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-3">
            <svg viewBox="0 0 280 120" className="h-32 w-full" aria-label="Monthly earnings chart">
              <path
                d="M0 95C24 86 42 72 58 71C80 69 90 54 112 48C132 43 148 33 168 34C190 35 209 61 228 60C246 59 262 39 280 18"
                stroke="url(#lineGradient)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="228" cy="60" r="5" fill="#7c9cff" />
              <circle cx="58" cy="71" r="5" fill="#34d0c0" />
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7c9cff" />
                  <stop offset="100%" stopColor="#34d0c0" />
                </linearGradient>
              </defs>
            </svg>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>+12.4% vs last month</span>
              <span className="font-medium text-foreground">₹18,250</span>
            </div>
          </div>
        </div>

        <div className="worker-compact-card rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Withdraw funds</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Payouts arrive within 24-48 hours
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Banknote className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 space-y-2 rounded-2xl border border-border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Withdraw available</span>
              <span className="font-semibold text-foreground">{formatCurrency(312)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Bank account</span>
              <span className="font-semibold text-foreground">HDFC • 4421</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Last withdrawal</span>
              <span className="font-semibold text-foreground">Jul 12</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Estimated arrival</span>
              <span className="font-semibold text-foreground">2 business days</span>
            </div>
            <button
              className="press mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-sm font-semibold text-muted-foreground"
              disabled
            >
              <ArrowRight className="h-4 w-4" /> Withdraw unavailable
            </button>
            <p className="text-xs leading-5 text-muted-foreground">
              Withdrawals are currently paused while we complete account review.
            </p>
          </div>
        </div>
      </div>

      <div className="worker-compact-grid flex flex-col gap-3">
        <div className="worker-compact-card rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Transaction history</p>
              <p className="mt-1 text-sm text-muted-foreground">Latest deposits and holds</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">
              <CircleDollarSign className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {transactions.map((tx) => {
              const tone =
                tx.status === "Completed"
                  ? "text-success"
                  : tx.status === "Escrow"
                    ? "text-warning"
                    : "text-destructive";
              return (
                <div
                  key={tx.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{tx.label}</p>
                    <p className="text-xs text-muted-foreground">{tx.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(tx.amount)}</p>
                    <p className={cn("text-xs font-medium", tone)}>{tx.status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="worker-compact-card rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Statistics</p>
              <p className="mt-1 text-sm text-muted-foreground">Performance snapshot</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Landmark className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {[
              { label: "Success rate", value: "98%" },
              { label: "Average payout", value: formatCurrency(128) },
              { label: "Average completion time", value: "3h" },
              { label: "Jobs completed", value: "47" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-3"
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="worker-compact-grid flex flex-col gap-3">
        <div className="worker-compact-card rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Recent activity</p>
              <p className="mt-1 text-sm text-muted-foreground">Latest platform updates</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {activityItems.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-3"
              >
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                  <p className="mt-2 text-sm font-medium">{item.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="worker-compact-card rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Tax documents</p>
              <p className="mt-1 text-sm text-muted-foreground">Downloadable statements</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">
              <FileText className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {taxDocs.map((doc) => (
              <div
                key={doc.title}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.month}</p>
                    <p className="text-xs text-muted-foreground">{doc.meta}</p>
                  </div>
                </div>
                <button className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
