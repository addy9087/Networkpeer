import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PlusCircle,
  Star,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";

import { PageHeader } from "@/components/shell/portal-shell";
import {
  AnonymousBadge,
  Chip,
  MapCanvas,
  SectionCard,
  StatCard,
  StatusChip,
} from "@/components/marketplace/primitives";
import { recentActivity } from "@/lib/mock-data";
import { getStoredDemoJobs } from "@/lib/demo-jobs";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/client/")({
  head: () => ({
    meta: [
      { title: "Client dashboard — NetworkPeers" },
      {
        name: "description",
        content:
          "Track posted, active and completed jobs, pending evidence reviews and wallet balance in one workspace.",
      },
      { property: "og:title", content: "Client dashboard — NetworkPeers" },
      { property: "og:description", content: "Your on-demand field work command centre." },
    ],
  }),
  component: ClientDashboard,
});

const activityTone = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning",
  danger: "bg-destructive/15 text-destructive",
} as const;

function ClientDashboard() {
  const demoJobs = useMemo(() => getStoredDemoJobs(), []);
  const jobs = demoJobs.length > 0 ? demoJobs : [];
  const activeJobs = jobs.filter((job) =>
    ["accepted", "en_route", "working", "submitted", "in_review"].includes(job.status),
  );
  const completedJobs = jobs.filter((job) => job.status === "completed");

  return (
    <>
      <PageHeader
        title="Good afternoon"
        description="Here's what's happening across your jobs today."
        action={
          <Link
            to="/client/jobs/new"
            className="press gradient-brand shadow-glow inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-base font-semibold text-primary-foreground"
          >
            <PlusCircle className="h-4 w-4" /> Post a job
          </Link>
        }
      />

      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible xl:grid-cols-5">
        <div className="min-w-[260px] max-w-[280px] flex-none snap-start sm:min-w-0 sm:max-w-none">
          <StatCard
            label="Jobs posted"
            value={String(jobs.length)}
            delta={jobs.length > 0 ? 12 : 0}
            icon={Briefcase}
            hint="this month"
          />
        </div>
        <div className="min-w-[260px] max-w-[280px] flex-none snap-start sm:min-w-0 sm:max-w-none">
          <StatCard
            label="Jobs active"
            value={String(activeJobs.length)}
            delta={activeJobs.length > 0 ? 4 : 0}
            icon={Clock3}
            tone="warning"
            hint="in progress"
          />
        </div>
        <div className="min-w-[260px] max-w-[280px] flex-none snap-start sm:min-w-0 sm:max-w-none">
          <StatCard
            label="Jobs completed"
            value={String(completedJobs.length)}
            delta={completedJobs.length > 0 ? 9 : 0}
            icon={CheckCircle2}
            tone="success"
            hint="all time"
          />
        </div>
        <div className="min-w-[260px] max-w-[280px] flex-none snap-start sm:min-w-0 sm:max-w-none">
          <StatCard
            label="Pending reviews"
            value={String(
              jobs.filter((job) => ["submitted", "in_review"].includes(job.status)).length,
            )}
            icon={Star}
            tone="teal"
            hint="evidence awaiting you"
          />
        </div>
        <div className="min-w-[260px] max-w-[280px] flex-none snap-start sm:min-w-0 sm:max-w-none">
          <StatCard
            label="Wallet balance"
            value={formatCurrency(1284)}
            delta={-6}
            icon={Wallet}
            hint="incl. escrow"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <SectionCard
            title="Active jobs"
            description="Live progress from verified workers"
            action={
              <Link
                to="/client/jobs"
                className="text-base font-medium text-primary hover:underline"
              >
                View all
              </Link>
            }
          >
            <div className="space-y-3">
              {jobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
                  <p className="text-base font-semibold">No jobs created yet</p>
                  <p className="mt-1 text-base text-muted-foreground">
                    Post a job and it will appear here instantly.
                  </p>
                </div>
              ) : (
                jobs.slice(0, 4).map((job) => (
                  <Link
                    key={job.id}
                    to="/client/jobs/$jobId"
                    params={{ jobId: job.id }}
                    className="hover-lift block rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{job.title}</p>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {job.ref} · {job.category} · {job.location}
                        </p>
                      </div>
                      <StatusChip status={job.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <AnonymousBadge role="Worker" />
                      <Chip tone="teal">{formatCurrency(job.payment)}</Chip>
                      <Chip>
                        <Clock3 className="h-3.5 w-3.5" /> {job.estimatedMinutes} min
                      </Chip>
                      <Chip tone={job.priority === "urgent" ? "danger" : "neutral"}>
                        Due {job.deadline}
                      </Chip>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Live worker map"
            description="Anonymous positions, updated every 30 seconds"
          >
            <MapCanvas className="h-64" pins={4} label="4 verified workers on site" />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Quick actions">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {[
                { label: "Post a new job", to: "/client/jobs/new", icon: PlusCircle },
                { label: "Review evidence", to: "/client/jobs", icon: ClipboardList },
                { label: "Top up wallet", to: "/client/wallet", icon: Wallet },
              ].map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="press grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-base font-medium hover:border-primary/40"
                >
                  <a.icon className="h-4 w-4 text-primary" />
                  <span className="truncate">{a.label}</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent activity">
            <ul className="space-y-4">
              {recentActivity.map((a) => (
                <li key={a.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <span
                    className={`mt-0.5 grid h-8 w-8 place-items-center rounded-xl ${activityTone[a.tone]}`}
                  >
                    <Star className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-medium">{a.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{a.detail}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
