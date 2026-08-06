import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, Clock3, MapPin, Mic, Video, Wallet } from "lucide-react";

import {
  AnonymousBadge,
  Chip,
  MapCanvas,
  Timeline,
  type TimelineStep,
} from "@/components/marketplace/primitives";
import { jobById, type Job } from "@/lib/mock-data";

export const Route = createFileRoute("/worker/job/$jobId")({
  loader: ({ params }): { job: Job } => ({ job: jobById(params.jobId) }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.job.title ?? "Job"} — NetworkPeers Worker` },
      {
        name: "description",
        content:
          "Job brief, location, payment and the media checklist you must capture in-app. Client identity stays hidden.",
      },
      { property: "og:title", content: "Job details — NetworkPeers Worker" },
      { property: "og:description", content: "Review the brief and accept the job." },
    ],
  }),
  component: WorkerJob,
});

const mediaIcon = { photo: Camera, video: Video, audio: Mic } as const;

function WorkerJob() {
  const { job } = Route.useLoaderData() as { job: Job };
  const [accepted, setAccepted] = useState(false);

  const steps: TimelineStep[] = [
    { label: "Accepted", time: "Now", state: "done" },
    { label: "En route", detail: "Tap when you set off", state: "current" },
    { label: "Arrived", detail: "GPS will confirm on site", state: "upcoming" },
    { label: "Working", detail: "Capture the checklist", state: "upcoming" },
    { label: "Submitted", detail: "Send evidence for review", state: "upcoming" },
  ];

  return (
    <div>
      <div className="gradient-brand relative px-4 pb-16 pt-4 text-primary-foreground">
        <Link
          to="/worker"
          className="press inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <p className="mt-4 text-xs opacity-85">
          {job.ref} · {job.category}
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-snug">{job.title}</h1>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Payment", `₹${job.payment}`],
            ["Distance", `${job.distanceKm} km`],
            ["Est. time", `${job.estimatedMinutes}m`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-primary-foreground/15 px-3 py-2.5">
              <p className="text-[11px] opacity-85">{k}</p>
              <p className="text-sm font-semibold">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="-mt-10 space-y-4 px-4">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-lift">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <AnonymousBadge role="Client" />
            <Chip tone={job.priority === "urgent" ? "danger" : "neutral"}>{job.priority}</Chip>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{job.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip>
              <MapPin className="h-3.5 w-3.5" /> {job.location}
            </Chip>
            <Chip>
              <Clock3 className="h-3.5 w-3.5" /> Due {job.deadline}
            </Chip>
          </div>
        </section>

        <MapCanvas className="h-44" pins={2} label={`${job.distanceKm} km away`} />

        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="text-sm font-semibold">Checklist ({job.checklist.length} tasks)</h2>
          <ul className="mt-3 space-y-3">
            {job.checklist.map((item, i) => (
              <li key={item.id} className="rounded-xl bg-muted/50 p-3">
                <p className="text-sm font-medium">
                  {i + 1}. {item.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.instructions}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
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
          <p className="mt-3 rounded-xl bg-warning/15 p-3 text-xs text-warning-foreground dark:text-warning">
            All media must be captured inside the app. Gallery uploads are disabled.
          </p>
        </section>

        {accepted && (
          <section className="animate-rise rounded-2xl border border-border bg-card p-4 shadow-soft">
            <h2 className="mb-3 text-sm font-semibold">Job status</h2>
            <Timeline steps={steps} />
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-success/20 text-success">
              <Wallet className="h-4 w-4" />
            </span>
            <p className="text-xs text-muted-foreground">
              ₹{job.payment} is already held in escrow and releases when your evidence is approved.
            </p>
          </div>
        </section>
      </div>

      <div className="glass sticky bottom-20 z-20 mx-4 mt-4 rounded-2xl p-2">
        {accepted ? (
          <Link
            to="/worker/task/$jobId"
            params={{ jobId: job.id }}
            className="press gradient-brand shadow-glow flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary-foreground"
          >
            <CheckCircle2 className="h-4 w-4" /> Start task execution
          </Link>
        ) : (
          <button
            onClick={() => setAccepted(true)}
            className="press gradient-brand shadow-glow flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-primary-foreground"
          >
            Accept job · ₹{job.payment}
          </button>
        )}
      </div>
    </div>
  );
}
