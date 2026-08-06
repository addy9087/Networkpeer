import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ImageOff,
  Lock,
  Mic,
  ShieldCheck,
  Video,
  Send,
  MapPin,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Chip } from "@/components/marketplace/primitives";
import { jobById, type Job, type MediaKind } from "@/lib/mock-data";

export const Route = createFileRoute("/worker/task/$jobId")({
  loader: ({ params }): { job: Job } => ({ job: jobById(params.jobId) }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Task execution — ${loaderData?.job.title ?? "Job"} — NetworkPeers` },
      {
        name: "description",
        content:
          "Complete each checklist step with in-app photo, video and audio capture. GPS and timestamps are attached automatically.",
      },
      { property: "og:title", content: "Task execution — NetworkPeers Worker" },
      { property: "og:description", content: "In-app capture only, with GPS-verified evidence." },
    ],
  }),
  component: TaskExecution,
});

const mediaMeta: Record<MediaKind, { icon: typeof Camera; label: string }> = {
  photo: { icon: Camera, label: "Photo" },
  video: { icon: Video, label: "Video" },
  audio: { icon: Mic, label: "Audio" },
};

function TaskExecution() {
  const { job } = Route.useLoaderData() as { job: Job };
  const [captured, setCaptured] = useState<Record<string, boolean>>({});
  const [capturing, setCapturing] = useState<{ key: string; kind: MediaKind } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const totalSlots = job.checklist.reduce((sum, c) => sum + c.required.length, 0);
  const doneSlots = Object.values(captured).filter(Boolean).length;
  const progress = totalSlots ? Math.round((doneSlots / totalSlots) * 100) : 0;

  function confirmCapture() {
    if (!capturing) return;
    setCaptured((p) => ({ ...p, [capturing.key]: true }));
    setCapturing(null);
  }

  if (submitted) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <span className="animate-rise grid h-20 w-20 place-items-center rounded-full bg-success/20 text-success">
          <CheckCircle2 className="h-10 w-10" />
        </span>
        <h1 className="mt-5 text-xl font-bold">Evidence submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {doneSlots} media files sent for review. Payment of ₹{job.payment} releases from escrow
          once the client approves.
        </p>
        <Link
          to="/worker"
          className="press gradient-brand mt-6 inline-flex h-11 items-center rounded-xl px-6 text-sm font-semibold text-primary-foreground"
        >
          Back to jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <Link
          to="/worker/job/$jobId"
          params={{ jobId: job.id }}
          aria-label="Back"
          className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{job.title}</p>
          <p className="truncate text-xs text-muted-foreground">{job.ref} · in progress</p>
        </div>
      </header>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <p className="text-sm font-medium">
            {doneSlots} of {totalSlots} captures
          </p>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="gradient-brand h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip tone="success">
            <MapPin className="h-3.5 w-3.5" /> GPS locked
          </Chip>
          <Chip tone="primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Timestamped
          </Chip>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning">
          <ImageOff className="h-4 w-4" />
        </span>
        <p className="text-xs leading-relaxed">
          <span className="font-semibold">Gallery upload disabled.</span> Every file must be
          recorded live in the app.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {job.checklist.map((item, i) => {
          const itemDone = item.required.every((r) => captured[`${item.id}-${r}`]);
          return (
            <section
              key={item.id}
              className={cn(
                "rounded-2xl border bg-card p-4 shadow-soft transition-colors",
                itemDone ? "border-success/50" : "border-border",
              )}
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                    itemDone
                      ? "bg-success text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {itemDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.instructions}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {item.required.map((kind) => {
                  const key = `${item.id}-${kind}`;
                  const done = captured[key];
                  const Meta = mediaMeta[kind];
                  return (
                    <button
                      key={key}
                      onClick={() => !done && setCapturing({ key, kind })}
                      className={cn(
                        "press grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                        done
                          ? "border-success/50 bg-success/10"
                          : "border-border bg-muted/40 hover:border-primary/50",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-xl",
                          done ? "bg-success/20 text-success" : "bg-primary-soft text-primary",
                        )}
                      >
                        <Meta.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {done ? `${Meta.label} captured` : `Capture ${Meta.label.toLowerCase()}`}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {done ? "GPS + timestamp attached" : "Opens in-app camera"}
                        </span>
                      </span>
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="glass sticky bottom-20 z-20 mt-4 rounded-2xl p-2">
        <button
          disabled={doneSlots < totalSlots}
          onClick={() => setSubmitted(true)}
          className={cn(
            "press flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
            doneSlots < totalSlots
              ? "cursor-not-allowed bg-muted text-muted-foreground"
              : "gradient-brand shadow-glow text-primary-foreground",
          )}
        >
          <Send className="h-4 w-4" />
          {doneSlots < totalSlots
            ? `${totalSlots - doneSlots} captures remaining`
            : "Submit evidence"}
        </button>
      </div>

      {capturing && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-6">
          <div className="animate-rise w-full max-w-md overflow-hidden rounded-t-3xl bg-card sm:rounded-3xl">
            <div className="relative grid h-64 place-items-center bg-foreground/90 text-background">
              <div className="absolute inset-6 rounded-2xl border-2 border-dashed border-background/40" />
              <div className="text-center">
                {(() => {
                  const Icon = mediaMeta[capturing.kind].icon;
                  return <Icon className="mx-auto h-10 w-10 opacity-80" />;
                })()}
                <p className="mt-2 text-sm font-medium">
                  Live {mediaMeta[capturing.kind].label.toLowerCase()} capture
                </p>
                <p className="text-xs opacity-70">37.7749° N, 122.4194° W</p>
              </div>
              <span className="absolute left-4 top-4 rounded-full bg-danger px-2.5 py-1 text-[11px] font-semibold">
                REC
              </span>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted-foreground">
                This file is watermarked with GPS coordinates, device ID and timestamp for fraud
                checks.
              </p>
              <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                <button
                  onClick={() => setCapturing(null)}
                  className="press h-11 rounded-xl border border-border px-5 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCapture}
                  className="press gradient-brand h-11 rounded-xl text-sm font-semibold text-primary-foreground"
                >
                  Capture
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
