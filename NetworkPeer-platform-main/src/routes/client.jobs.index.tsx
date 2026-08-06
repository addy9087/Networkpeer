import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Archive, Briefcase, Copy, Pencil, PlusCircle, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn, formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/shell/portal-shell";
import { AnonymousBadge, Chip, EmptyState, StatusChip } from "@/components/marketplace/primitives";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getStoredDemoJobs, saveDemoJobs } from "@/lib/demo-jobs";

export const Route = createFileRoute("/client/jobs/")({
  head: () => ({
    meta: [
      { title: "My jobs — NetworkPeers client" },
      {
        name: "description",
        content: "Filter, search and manage every job you have posted on NetworkPeers.",
      },
      { property: "og:title", content: "My jobs — NetworkPeers client" },
      {
        property: "og:description",
        content: "Every posted job, its status and its evidence in one table.",
      },
    ],
  }),
  component: ClientJobs,
});

const filters = ["All", "Open", "In progress", "In review", "Completed"] as const;

function ClientJobs() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const [visibleJobs, setVisibleJobs] = useState(() => getStoredDemoJobs());

  useEffect(() => {
    setVisibleJobs(getStoredDemoJobs());
  }, []);

  const filtered = useMemo(
    () =>
      visibleJobs.filter((j) => {
        const matchQuery =
          !query ||
          j.title.toLowerCase().includes(query.toLowerCase()) ||
          j.ref.toLowerCase().includes(query.toLowerCase());
        const matchFilter =
          filter === "All" ||
          (filter === "Open" && j.status === "open") ||
          (filter === "In progress" && ["accepted", "en_route", "working"].includes(j.status)) ||
          (filter === "In review" && ["submitted", "in_review"].includes(j.status)) ||
          (filter === "Completed" && j.status === "completed");
        return matchQuery && matchFilter;
      }),
    [filter, query, visibleJobs],
  );

  const handleDelete = (jobId: string) => {
    const nextJobs = visibleJobs.filter((job) => job.id !== jobId);
    setVisibleJobs(nextJobs);
    saveDemoJobs(nextJobs);
    toast.success("Job deleted successfully.");
  };

  const summary = `${visibleJobs.length} ${visibleJobs.length === 1 ? "job" : "jobs"} posted · ${visibleJobs.filter((job) => ["submitted", "in_review"].includes(job.status)).length} awaiting your review`;

  return (
    <>
      <PageHeader
        title="My jobs"
        description={summary}
        action={
          <Link
            to="/client/jobs/new"
            className="press gradient-brand shadow-glow inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-base font-semibold text-primary-foreground"
          >
            <PlusCircle className="h-4 w-4" /> Post a job
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or reference"
            className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-base font-medium transition-all",
                filter === f
                  ? "bg-card shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {visibleJobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs created yet"
          description="Create your first job and it will appear here for review, editing and deletion."
          action={
            <Link
              to="/client/jobs/new"
              className="press gradient-brand inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-base font-semibold text-primary-foreground"
            >
              <PlusCircle className="h-4 w-4" /> Post a job
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs match this view"
          description="Try a different filter, or post a new job to get verified workers on site within the hour."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto_auto] gap-4 border-b border-border px-5 py-3 text-[15px] font-medium uppercase tracking-wide text-muted-foreground lg:grid">
            <span>Job</span>
            <span>Worker</span>
            <span>Payment</span>
            <span>Deadline</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          <ul className="divide-y divide-border">
            {filtered.map((job) => (
              <li key={job.id} className="px-5 py-4 transition-colors hover:bg-accent/60">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto_auto] lg:items-center lg:gap-4">
                  <Link to="/client/jobs/$jobId" params={{ jobId: job.id }} className="min-w-0">
                    <p className="truncate text-base font-semibold">{job.title}</p>
                    <p className="truncate text-base text-muted-foreground">
                      {job.ref} · {job.category}
                    </p>
                  </Link>
                  <div className="min-w-0">
                    {job.status === "open" ? (
                      <Chip>Awaiting applicants</Chip>
                    ) : (
                      <AnonymousBadge role="Worker" />
                    )}
                  </div>
                  <p className="text-base font-semibold">{formatCurrency(job.payment)}</p>
                  <p className="text-base text-muted-foreground">{job.deadline}</p>
                  <StatusChip status={job.status} />
                  <div className="flex items-center gap-2">
                    <Link
                      to="/client/jobs/$jobId"
                      params={{ jobId: job.id }}
                      className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-2 text-base font-medium"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        toast.success("Job duplicated. A fresh draft is ready.");
                      }}
                      className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-2 text-base font-medium"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toast.success("Job archived. It will stay available in the archive.");
                      }}
                      className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-2 text-base font-medium"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          className="press inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-base font-medium text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this job?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the job from your active list. You can still restore it
                            later from archived work.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(job.id)}>
                            Delete job
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
