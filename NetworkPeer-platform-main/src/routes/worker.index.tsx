import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Filter, List, MapPin, Search, Clock3, Map as MapIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { AnonymousBadge, Chip, MapCanvas } from "@/components/marketplace/primitives";
import { jobs } from "@/lib/mock-data";

export const Route = createFileRoute("/worker/")({
  head: () => ({
    meta: [
      { title: "Nearby jobs — NetworkPeers Worker" },
      {
        name: "description",
        content:
          "Browse nearby gigs with distance, payment, estimated time and category. Apply in one tap — clients stay anonymous.",
      },
      { property: "og:title", content: "Nearby jobs — NetworkPeers Worker" },
      { property: "og:description", content: "Find and accept verified field work near you." },
    ],
  }),
  component: WorkerHome,
});

function WorkerHome() {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div className="px-4 pt-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Available near</p>
          <h1 className="flex items-center gap-1 truncate text-lg font-semibold">
            <MapPin className="h-4 w-4 shrink-0 text-primary" /> Downtown, SF
          </h1>
        </div>
        <span className="rounded-full bg-success/20 px-3 py-1.5 text-xs font-semibold text-success">
          Online
        </span>
      </header>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search jobs"
            className="h-11 w-full rounded-2xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <button
          aria-label="Filters"
          className="press grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card"
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
        {(
          [
            { id: "list", label: "List", icon: List },
            { id: "map", label: "Map", icon: MapIcon },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition-all",
              view === v.id ? "bg-card shadow-soft" : "text-muted-foreground",
            )}
          >
            <v.icon className="h-4 w-4" /> {v.label}
          </button>
        ))}
      </div>

      {view === "map" ? (
        <div className="animate-rise mt-4">
          <MapCanvas className="h-[420px]" pins={5} label="6 jobs within 5 km" />
        </div>
      ) : (
        <div className="animate-rise mt-4 space-y-3">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <Chip tone="teal">{job.category}</Chip>
                  <h2 className="mt-2 truncate text-sm font-semibold">{job.title}</h2>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.location}</p>
                </div>
                <p className="text-lg font-bold text-primary">₹{job.payment}</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip>
                  <MapPin className="h-3.5 w-3.5" /> {job.distanceKm} km
                </Chip>
                <Chip>
                  <Clock3 className="h-3.5 w-3.5" /> {job.estimatedMinutes} min
                </Chip>
                <AnonymousBadge role="Client" />
              </div>

              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <Link
                  to="/worker/job/$jobId"
                  params={{ jobId: job.id }}
                  className="press inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold"
                >
                  Details
                </Link>
                <Link
                  to="/worker/job/$jobId"
                  params={{ jobId: job.id }}
                  className="press gradient-brand inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-semibold text-primary-foreground"
                >
                  Apply
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
