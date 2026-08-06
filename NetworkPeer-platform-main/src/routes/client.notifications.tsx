import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BellOff, Briefcase, CheckCheck, CreditCard, Settings2, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shell/portal-shell";
import { EmptyState, SectionCard } from "@/components/marketplace/primitives";
import { notifications as seed } from "@/lib/mock-data";

export const Route = createFileRoute("/client/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — NetworkPeers client" },
      {
        name: "description",
        content:
          "Job updates, evidence reviews and payment alerts from your NetworkPeers workspace.",
      },
      { property: "og:title", content: "Notifications — NetworkPeers client" },
      {
        property: "og:description",
        content: "Everything happening across your jobs, in one feed.",
      },
    ],
  }),
  component: Notifications,
});

const kindMeta = {
  job: { icon: Briefcase, tone: "bg-primary-soft text-primary" },
  payment: { icon: CreditCard, tone: "bg-success/20 text-success" },
  review: { icon: Star, tone: "bg-warning/20 text-warning" },
  system: { icon: Settings2, tone: "bg-muted text-muted-foreground" },
} as const;

const tabs = ["All", "Unread", "Jobs", "Payments"] as const;

function Notifications() {
  const [items, setItems] = useState(seed);
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");

  const filtered = items.filter((n) =>
    tab === "All"
      ? true
      : tab === "Unread"
        ? n.unread
        : tab === "Jobs"
          ? n.kind === "job" || n.kind === "review"
          : n.kind === "payment",
  );

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${items.filter((n) => n.unread).length} unread`}
        action={
          <button
            onClick={() => setItems((prev) => prev.map((n) => ({ ...n, unread: false })))}
            className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-base font-medium"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        }
      />

      <div className="mb-5 inline-flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-base font-medium transition-all",
              tab === t ? "bg-card shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title="You're all caught up"
              description="New job updates, evidence submissions and payment events will land here."
            />
          ) : (
            <ul className="space-y-3">
              {filtered.map((n) => {
                const meta = kindMeta[n.kind];
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "hover-lift grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border bg-card p-4 shadow-soft",
                      n.unread ? "border-primary/40" : "border-border",
                    )}
                  >
                    <span className={cn("grid h-10 w-10 place-items-center rounded-xl", meta.tone)}>
                      <meta.icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{n.title}</p>
                      <p className="text-base text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-base text-muted-foreground">{n.time}</p>
                    </div>
                    {n.unread && <span className="mt-2 h-2 w-2 rounded-full bg-primary" />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <SectionCard title="Preferences" description="Choose what reaches you">
          <ul className="space-y-4">
            {[
              ["Worker accepted a job", true],
              ["Evidence submitted", true],
              ["Deadline reminders", true],
              ["Payment & escrow events", true],
              ["Weekly summary email", false],
            ].map(([label, on]) => (
              <li
                key={String(label)}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
              >
                <span className="truncate text-base">{label}</span>
                <span
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    on ? "bg-primary" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-soft transition-all",
                      on ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
