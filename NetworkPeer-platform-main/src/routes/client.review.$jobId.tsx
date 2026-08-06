import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  Clock3,
  MapPin,
  Mic,
  Pause,
  Play,
  Star,
  ThumbsDown,
  Volume2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shell/portal-shell";
import {
  AnonymousBadge,
  Chip,
  SectionCard,
  SuccessCheck,
} from "@/components/marketplace/primitives";
import { evidence, jobById, type Job } from "@/lib/mock-data";

export const Route = createFileRoute("/client/review/$jobId")({
  loader: ({ params }): { job: Job } => ({ job: jobById(params.jobId) }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Review evidence ${loaderData?.job.ref ?? ""} — NetworkPeers` },
      {
        name: "description",
        content:
          "Inspect photo, video and audio evidence with GPS and timestamp badges, then approve, reject or rate the work.",
      },
      { property: "og:title", content: "Review evidence — NetworkPeers" },
      { property: "og:description", content: "Approve or reject verified on-site evidence." },
    ],
  }),
  component: ReviewPage,
});

const mediaIcon = { photo: Camera, video: Play, audio: Volume2 } as const;

function ReviewPage() {
  const { job } = Route.useLoaderData() as { job: Job };
  const [activeId, setActiveId] = useState(evidence[0].id);
  const [decision, setDecision] = useState<"none" | "approved" | "rejected">("none");
  const [rating, setRating] = useState(5);
  const [playing, setPlaying] = useState(false);

  const active = evidence.find((e) => e.id === activeId)!;
  const ActiveIcon = mediaIcon[active.kind];

  if (decision === "approved") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
        <SuccessCheck />
        <h1 className="mt-6 text-4xl font-semibold">Evidence approved</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          ₹{job.payment.toFixed(2)} released from escrow to the Verified Worker. Your {rating}-star
          review was posted.
        </p>
        <Link
          to="/client/jobs"
          className="press gradient-brand mt-6 inline-flex rounded-xl px-4 py-2.5 text-base font-semibold text-primary-foreground"
        >
          Back to jobs
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Review evidence"
        description={`${job.ref} · ${evidence.length} items captured in-app`}
        action={
          <Link
            to="/client/jobs/$jobId"
            params={{ jobId: job.id }}
            className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-base font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Job details
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="surface-grid relative grid h-[320px] place-items-center bg-muted/40 sm:h-[420px]">
              <div className="absolute inset-0 bg-[var(--gradient-surface)]" aria-hidden />
              <ActiveIcon className="relative h-16 w-16 text-muted-foreground" />
              <div className="glass absolute left-4 top-4 flex flex-wrap gap-2 rounded-full px-3 py-1.5 text-sm font-medium">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-success" /> GPS {active.gps} ·{" "}
                  {active.accuracy}
                </span>
              </div>
              <div className="glass absolute right-4 top-4 rounded-full px-3 py-1.5 text-sm font-medium">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" /> Captured {active.time}
                </span>
              </div>

              {active.kind !== "photo" && (
                <div className="glass absolute inset-x-4 bottom-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-4 py-3">
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    aria-label={playing ? "Pause" : "Play"}
                    className="press grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"
                  >
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <div className="h-1.5 min-w-0 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full bg-primary transition-all",
                        playing ? "w-2/3" : "w-1/4",
                      )}
                    />
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {active.kind === "video" ? "00:20" : "00:14"}
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{active.task}</p>
                <p className="text-sm capitalize text-muted-foreground">
                  {active.kind} evidence · in-app capture
                </p>
              </div>
              <Chip tone="success">
                <Check className="h-3.5 w-3.5" /> Verified
              </Chip>
            </div>
          </div>

          <SectionCard title="Gallery" description="Tap any item to inspect">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {evidence.map((e) => {
                const Icon = mediaIcon[e.kind];
                return (
                  <button
                    key={e.id}
                    onClick={() => setActiveId(e.id)}
                    className={cn(
                      "press surface-grid grid aspect-square place-items-center rounded-xl border-2 bg-muted/50 transition-all",
                      e.id === activeId
                        ? "border-primary shadow-glow"
                        : "border-transparent hover:border-border",
                    )}
                    aria-label={e.task}
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Submission summary">
            <div className="space-y-3 text-base">
              {[
                ["Photos", "3 of 3"],
                ["Videos", "2 of 2"],
                ["Audio notes", "1 of 1"],
                ["Location verified", "All items"],
                ["Fraud score", "12 / 100"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <AnonymousBadge role="Worker" />
            </div>
          </SectionCard>

          <SectionCard title="Leave a review">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  aria-label={`${n} stars`}
                  className="press"
                >
                  <Star
                    className={cn(
                      "h-7 w-7",
                      n <= rating ? "fill-warning text-warning" : "text-muted-foreground",
                    )}
                  />
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              placeholder="Share feedback about the quality of the evidence (visible anonymously)."
              className="mt-3 w-full rounded-xl border border-border bg-card px-3.5 py-3 text-base outline-none focus:ring-2 focus:ring-ring/40"
            />
            <div className="mt-4 grid gap-2">
              <button
                onClick={() => setDecision("approved")}
                className="press inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-success text-base font-semibold text-success-foreground"
              >
                <Check className="h-4 w-4" /> Approve & release ₹{job.payment.toFixed(2)}
              </button>
              <button
                onClick={() => setDecision("rejected")}
                className="press inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 text-base font-semibold text-destructive"
              >
                <ThumbsDown className="h-4 w-4" /> Reject submission
              </button>
            </div>
          </SectionCard>

          {decision === "rejected" && (
            <div className="animate-rise rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <p className="text-base font-semibold text-destructive">Confirm rejection</p>
                <button aria-label="Dismiss" onClick={() => setDecision("none")} className="press">
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </div>
              <p className="mt-1 text-base text-muted-foreground">
                The worker will be asked to recapture the flagged items. Escrow stays held and a
                dispute can be opened after 24 hours.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setDecision("none")}
                  className="press h-10 flex-1 rounded-xl border border-border bg-card text-base font-medium"
                >
                  Cancel
                </button>
                <button className="press h-10 flex-1 rounded-xl bg-destructive text-base font-semibold text-destructive-foreground">
                  Reject evidence
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
