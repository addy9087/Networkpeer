import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  FileCheck2,
  PlusCircle,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/shell/portal-shell";
import { Chip, SectionCard, StatCard } from "@/components/marketplace/primitives";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — NetworkPeers" },
      {
        name: "description",
        content: "Operations overview with approvals, payments and fraud signals.",
      },
    ],
  }),
  component: AdminDashboard,
});

const metrics = [
  { label: "Total jobs", value: "214", delta: 12, icon: Briefcase, tone: "primary" as const },
  { label: "Active jobs", value: "76", delta: 5, icon: FileCheck2, tone: "teal" as const },
  { label: "Completed jobs", value: "132", delta: 9, icon: Building2, tone: "success" as const },
  { label: "Clients", value: "86", delta: 4, icon: Users, tone: "primary" as const },
  { label: "Workers", value: "128", delta: 6, icon: Wallet, tone: "teal" as const },
  {
    label: "Revenue",
    value: formatCurrency(842000),
    delta: 8,
    icon: TrendingUp,
    tone: "success" as const,
  },
  { label: "Pending reviews", value: "14", delta: -2, icon: Sparkles, tone: "warning" as const },
  { label: "Banned users", value: "3", delta: 0, icon: Building2, tone: "warning" as const },
];

function AdminDashboard() {
  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        title="Operations overview"
        description="Monitor live demand, fraud signals and payment health from one control centre."
        action={
          <Link
            to="/admin/jobs"
            className="press gradient-brand shadow-glow inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-base font-semibold text-primary-foreground"
          >
            <PlusCircle className="h-4 w-4" /> Review live jobs
          </Link>
        }
      />

      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-2 md:gap-4 md:overflow-visible xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="min-w-[260px] max-w-[280px] flex-none snap-start md:min-w-0 md:max-w-none"
          >
            <StatCard
              label={metric.label}
              value={metric.value}
              delta={metric.delta}
              icon={metric.icon}
              tone={metric.tone}
              hint="this week"
            />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Revenue trend" description="Weekly jobs and revenue">
          <div className="flex h-48 items-end gap-3 rounded-2xl border border-border bg-muted/40 p-4">
            {[48, 64, 56, 78, 90, 84].map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-2xl bg-gradient-to-t from-primary to-brand-teal"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[13px] text-muted-foreground">W{index + 1}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent activity" description="Platform signals from the last 24 hours">
          <ul className="space-y-3">
            {[
              {
                title: "Evidence submitted",
                detail: "GF-1041 · 6 media files captured",
                time: "8 min ago",
              },
              {
                title: "Worker accepted",
                detail: "GF-1037 · Verified worker assigned",
                time: "42 min ago",
              },
              { title: "Payout released", detail: "GF-1038 · ₹145 disbursed", time: "2 hrs ago" },
            ].map((entry) => (
              <li
                key={entry.title}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card/80 p-3"
              >
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-medium">{entry.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{entry.detail}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">{entry.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Charts" description="Approval throughput and volume pressure">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-base font-semibold">Approval pace</p>
              <div className="mt-3 flex h-28 items-end gap-2">
                {[34, 44, 38, 54, 62, 70].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t-xl bg-gradient-to-t from-primary to-brand-teal"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-base font-semibold">Escalation load</p>
              <div className="mt-3 flex h-28 items-end gap-2">
                {[22, 28, 25, 33, 40, 36].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t-xl bg-gradient-to-t from-warning to-success"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Quick actions" description="Push common workflows">
          <div className="grid gap-3">
            {[
              { label: "Open job queue", to: "/admin/jobs" },
              { label: "Review worker quality", to: "/admin/workers" },
              { label: "Inspect payouts", to: "/admin/payments" },
              { label: "Check recent reviews", to: "/admin/reviews" },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="press flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-3 text-base font-medium hover:border-primary/40"
              >
                <span>{item.label}</span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
