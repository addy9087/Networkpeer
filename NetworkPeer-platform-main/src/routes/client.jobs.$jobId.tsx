import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  ClipboardCheck,
  Clock3,
  FileText,
  MapPin,
  Mic,
  Star,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/portal-shell";
import {
  AnonymousBadge,
  Chip,
  MapCanvas,
  SectionCard,
  StatusChip,
  Timeline,
  type TimelineStep,
} from "@/components/marketplace/primitives";
import { evidence, jobById, type Job } from "@/lib/mock-data";

export const Route = createFileRoute("/client/jobs/$jobId")({
  loader: ({ params }): { job: Job } => ({ job: jobById(params.jobId) }),
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.job.ref} — ${loaderData.job.title}`
      : "Job details — NetworkPeers";
    return {
      meta: [
        { title: `${title} | NetworkPeers` },
        {
          name: "description",
          content:
            loaderData?.job.description ??
            "Job timeline, worker status, checklist and evidence preview.",
        },
        { property: "og:title", content: `${title} | NetworkPeers` },
        {
          property: "og:description",
          content: "Timeline, worker status, checklist and evidence in one view.",
        },
      ],
    };
  },
  component: JobDetails,
});

const mediaIcon = { photo: Camera, video: Video, audio: Mic } as const;

function JobDetails() {
  const { job } = Route.useLoaderData() as { job: Job };

  const steps: TimelineStep[] = [
    { label: "Job posted", detail: "Escrow funded", time: job.postedAgo, state: "done" },
    { label: "Accepted", detail: "Verified Worker accepted", time: "13:41", state: "done" },
    { label: "En route", detail: "1.2 km away", time: "13:52", state: "done" },
    { label: "Arrived", detail: "GPS confirmed on site", time: "14:01", state: "done" },
    {
      label: "Working",
      detail: "3 of 4 checklist items captured",
      time: "14:24",
      state: "current",
    },
    { label: "Submitted", detail: "Awaiting evidence submission", state: "upcoming" },
    { label: "Approved & paid", state: "upcoming" },
  ];

  return (
    <>
      <PageHeader
        title={job.title}
        description={`${job.ref} · ${job.category} · posted ${job.postedAgo}`}
        action={
          <Link
            to="/client/jobs"
            className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-base font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusChip status={job.status} />
        <AnonymousBadge role="Worker" />
        <Chip tone="teal">₹{job.payment.toFixed(2)} in escrow</Chip>
        <Chip>
          <Clock3 className="h-3.5 w-3.5" /> {job.estimatedMinutes} min est.
        </Chip>
        <Chip tone={job.priority === "urgent" ? "danger" : "neutral"}>Due {job.deadline}</Chip>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => toast.success("Job updated.")}
          className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-base font-medium"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => toast.success("Job archived.")}
          className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-base font-medium"
        >
          Archive
        </button>
        <button
          type="button"
          onClick={() => toast.error("Job cancelled.")}
          className="press inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-base font-medium text-destructive"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => toast.success("Delete action confirmed.")}
          className="press inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-base font-medium text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <SectionCard title="Brief">
            <p className="text-base leading-relaxed text-muted-foreground">{job.description}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["Location", job.location],
                ["Payment", `₹${job.payment.toFixed(2)}`],
                ["Priority", job.priority],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-muted/60 p-3">
                  <p className="text-base text-muted-foreground">{k}</p>
                  <p className="mt-0.5 truncate text-base font-semibold capitalize">{v}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Checklist preview" description="What the worker must capture on site">
            <ul className="space-y-3">
              {job.checklist.map((item, i) => (
                <li key={item.id} className="rounded-2xl border border-border p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">
                        {i + 1}. {item.title}
                      </p>
                      <p className="mt-0.5 text-base text-muted-foreground">{item.instructions}</p>
                    </div>
                    <Chip tone={item.done ? "success" : "neutral"}>
                      {item.done ? "Captured" : "Pending"}
                    </Chip>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.required.map((r) => {
                      const Icon = mediaIcon[r];
                      return (
                        <Chip key={r} tone="primary">
                          <Icon className="h-3.5 w-3.5" /> {r}
                        </Chip>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="Evidence preview"
            description={`${evidence.length} items captured in-app with GPS`}
            action={
              <Link
                to="/client/review/$jobId"
                params={{ jobId: job.id }}
                className="press gradient-brand inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-base font-semibold text-primary-foreground"
              >
                <ClipboardCheck className="h-4 w-4" /> Review
              </Link>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {evidence.slice(0, 6).map((e) => {
                const Icon = mediaIcon[e.kind];
                return (
                  <div
                    key={e.id}
                    className="hover-lift overflow-hidden rounded-2xl border border-border"
                  >
                    <div className="surface-grid relative grid h-24 place-items-center bg-muted/50">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                      <span className="glass absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium">
                        {e.time}
                      </span>
                    </div>
                    <p className="truncate px-3 py-2 text-base font-medium">{e.task}</p>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Worker status">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-base font-semibold text-primary">
                VW
              </span>
              <div className="min-w-0">
                <AnonymousBadge role="Worker" />
                <p className="mt-1 flex items-center gap-1 text-base text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" /> 4.8 · 137 jobs
                  completed
                </p>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-muted/60 p-3 text-base text-muted-foreground">
              Identity, phone and email stay hidden. Message the worker through the platform thread.
            </p>
            <button className="press mt-3 h-11 w-full rounded-xl border border-border bg-card text-base font-semibold">
              Open platform message
            </button>
          </SectionCard>

          <SectionCard title="Live location">
            <MapCanvas className="h-48" pins={2} label="Worker on site · ±4 m" />
            <p className="mt-3 flex items-center gap-1.5 text-base text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {job.location}
            </p>
          </SectionCard>

          <SectionCard title="Timeline">
            <Timeline steps={steps} />
          </SectionCard>

          <SectionCard title="Client notes" description="Internal context for the team">
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-base text-muted-foreground">
              <p>
                Access instructions are shared only through the platform thread. The worker should
                arrive between 14:00 and 14:15 and avoid direct contact.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Job history">
            <ul className="space-y-3 text-base">
              {[
                ["Escrow funded", job.postedAgo],
                ["3 applicants matched", "11 min ago"],
                ["Worker assigned", "13:41"],
                ["Checklist updated", "14:24"],
              ].map(([a, b]) => (
                <li key={a} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <span className="truncate text-muted-foreground">{a}</span>
                  <span className="text-base text-muted-foreground">{b}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
