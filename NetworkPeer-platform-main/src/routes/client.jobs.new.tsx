import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileText,
  GripVertical,
  Loader2,
  Mic,
  Plus,
  Trash2,
  UploadCloud,
  Video,
} from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/shell/portal-shell";
import { MapCanvas, SectionCard, SuccessCheck } from "@/components/marketplace/primitives";
import { categories, type MediaKind } from "@/lib/mock-data";
import { saveDemoJobs, getStoredDemoJobs } from "@/lib/demo-jobs";

export const Route = createFileRoute("/client/jobs/new")({
  head: () => ({
    meta: [
      { title: "Create a job — NetworkPeers client" },
      {
        name: "description",
        content:
          "Post a field job with location, payment, deadline and a checklist where each task requires photo, video or audio proof.",
      },
      { property: "og:title", content: "Create a job — NetworkPeers client" },
      {
        property: "og:description",
        content: "Build media-required checklists and get verified evidence back.",
      },
    ],
  }),
  component: CreateJob,
});

interface Draft {
  id: number;
  title: string;
  instructions: string;
  required: MediaKind[];
}

type AttachmentKind = "photo" | "video" | "audio" | "document";

interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  kind: AttachmentKind;
  preview?: string;
}

const mediaOptions: { kind: MediaKind; label: string; icon: typeof Camera }[] = [
  { kind: "photo", label: "Photo", icon: Camera },
  { kind: "video", label: "Video", icon: Video },
  { kind: "audio", label: "Audio", icon: Mic },
];

function labelCls() {
  return "mb-1.5 block text-base font-medium";
}
const inputCls =
  "w-full rounded-xl border border-border bg-card px-3.5 py-3 text-base outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40";

const attachmentOptions: {
  kind: AttachmentKind;
  label: string;
  icon: typeof Camera;
  accept: string;
}[] = [
  { kind: "photo", label: "Photo", icon: Camera, accept: "image/*" },
  { kind: "video", label: "Video", icon: Video, accept: "video/*" },
  { kind: "audio", label: "Audio", icon: Mic, accept: "audio/*" },
  { kind: "document", label: "Document", icon: FileText, accept: ".pdf,.doc,.docx,.txt" },
];

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  const inKb = size / 1024;
  if (inKb < 1024) return `${inKb.toFixed(1)} KB`;
  return `${(inKb / 1024).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string | undefined>((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

function CreateJob() {
  const router = useRouter();
  const [items, setItems] = useState<Draft[]>([
    {
      id: 1,
      title: "Take photo of storefront",
      instructions: "Capture the full signage and entrance.",
      required: ["photo"],
    },
    {
      id: 2,
      title: "Record 20 second video",
      instructions: "Slow pan across the sales floor.",
      required: ["video"],
    },
    {
      id: 3,
      title: "Record audio confirmation",
      instructions: "State the job reference and the date.",
      required: ["audio"],
    },
  ]);
  const [priority, setPriority] = useState("normal");
  const [state, setState] = useState<"idle" | "saving" | "posted">("idle");
  const [title, setTitle] = useState("Storefront compliance audit");
  const [category, setCategory] = useState(categories[0]);
  const [location, setLocation] = useState("412 Market St, Downtown");
  const [description, setDescription] = useState(
    "Capture the current storefront condition and share evidence from the visit.",
  );
  const [payment, setPayment] = useState(780);
  const [minutes, setMinutes] = useState(45);
  const [deadline, setDeadline] = useState("2026-07-28T18:00");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [attachmentAccept, setAttachmentAccept] = useState(attachmentOptions[0].accept);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const escrowAmount = useMemo(() => Math.round(payment * 1.04), [payment]);

  const update = (id: number, patch: Partial<Draft>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const toggleMedia = (id: number, kind: MediaKind) =>
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              required: i.required.includes(kind)
                ? i.required.filter((k) => k !== kind)
                : [...i.required, kind],
            }
          : i,
      ),
    );

  const handleAttachmentPick = (kind: AttachmentKind) => {
    setAttachmentAccept(
      attachmentOptions.find((option) => option.kind === kind)?.accept ??
        attachmentOptions[0].accept,
    );
    fileInputRef.current?.click();
  };

  const handleAttachmentSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const uploaded = await Promise.all(
      files.map(async (file) => {
        const preview = await readFileAsDataUrl(file);
        return {
          id: `${file.name}-${file.size}-${file.lastModified}`,
          name: file.name,
          size: file.size,
          type: file.type,
          kind: (attachmentOptions.find((option) => option.accept === attachmentAccept)?.kind ??
            "document") as AttachmentKind,
          preview,
        } satisfies AttachmentItem;
      }),
    );

    setAttachments((prev) => [...prev, ...uploaded]);
    event.target.value = "";
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((item) => item.id !== id));

  if (state === "posted") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
        <SuccessCheck />
        <h1 className="mt-6 text-4xl font-semibold">Job posted</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {formatCurrency(escrowAmount)} has been reserved in escrow. Verified workers nearby are
          being notified now.
          {attachments.length > 0
            ? ` ${attachments.length} attachment${attachments.length === 1 ? "" : "s"} were included with the posting.`
            : ""}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.navigate({ to: "/client/jobs" })}
            className="press gradient-brand inline-flex rounded-xl px-4 py-2.5 text-base font-semibold text-primary-foreground"
          >
            View my jobs
          </button>
          <button
            onClick={() => setState("idle")}
            className="press rounded-xl border border-border bg-card px-4 py-2.5 text-base font-semibold"
          >
            Post another
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Create a job"
        description="Define the work, the location and exactly what proof you need back."
        action={
          <Link
            to="/client/jobs"
            className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-base font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <SectionCard title="Job basics" description="What needs doing and where">
            <div className="grid gap-4">
              <label>
                <span className={labelCls()}>Job title</span>
                <input
                  className={inputCls}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Storefront compliance audit"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className={labelCls()}>Category</span>
                  <select
                    className={inputCls}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelCls()}>Location</span>
                  <input
                    className={inputCls}
                    placeholder="Search an address"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </label>
              </div>
              <label>
                <span className={labelCls()}>Description</span>
                <textarea
                  rows={4}
                  className={inputCls}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the task, access instructions and anything the worker should know."
                />
              </label>

              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-primary" />
                  <p className="text-base font-semibold">Attachments & reference media</p>
                </div>
                <p className="mt-2 text-base text-muted-foreground">
                  Upload multiple photos, videos, audio clips or documents to keep the job brief
                  attached to the posting.
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {attachmentOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.kind}
                        type="button"
                        onClick={() => handleAttachmentPick(option.kind)}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-all hover:border-primary/40"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <span>
                          <span className="block text-base font-medium">{option.label}</span>
                          <span className="block text-base text-muted-foreground">
                            Add {option.label.toLowerCase()} files
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={attachmentAccept}
                  className="sr-only"
                  onChange={handleAttachmentSelection}
                />

                {attachments.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {attachments.map((attachment) => {
                      const Icon =
                        attachment.kind === "video"
                          ? Video
                          : attachment.kind === "audio"
                            ? Mic
                            : attachment.kind === "document"
                              ? FileText
                              : Camera;
                      return (
                        <li
                          key={attachment.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                              <Icon className="h-4.5 w-4.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-base font-medium">{attachment.name}</p>
                              <p className="text-base text-muted-foreground">
                                {attachment.kind.charAt(0).toUpperCase() + attachment.kind.slice(1)}{" "}
                                · {formatFileSize(attachment.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(attachment.id)}
                            className="shrink-0 rounded-lg border border-border bg-background p-2 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <MapCanvas className="h-52" label="Drag the pin to fine-tune" />
            </div>
          </SectionCard>

          <SectionCard
            title="Checklist builder"
            description="Each task can require photo, video or audio evidence"
          >
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="animate-rise rounded-2xl border border-border bg-muted/30 p-4"
                >
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                    <p className="truncate text-[15px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Task {idx + 1}
                    </p>
                    <button
                      aria-label="Remove task"
                      onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                      className="press grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <input
                      value={item.title}
                      onChange={(e) => update(item.id, { title: e.target.value })}
                      className={inputCls}
                      placeholder="Task name"
                    />
                    <textarea
                      rows={2}
                      value={item.instructions}
                      onChange={(e) => update(item.id, { instructions: e.target.value })}
                      className={inputCls}
                      placeholder="Instructions for the worker"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-medium text-muted-foreground">Required:</span>
                      {mediaOptions.map((m) => {
                        const active = item.required.includes(m.kind);
                        return (
                          <button
                            key={m.kind}
                            onClick={() => toggleMedia(item.id, m.kind)}
                            className={cn(
                              "press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[15px] font-medium transition-all",
                              active
                                ? "border-primary bg-primary-soft text-primary"
                                : "border-border bg-card text-muted-foreground hover:border-primary/40",
                            )}
                          >
                            <m.icon className="h-3.5 w-3.5" />
                            {m.label}
                            {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    { id: Date.now(), title: "", instructions: "", required: ["photo"] },
                  ])
                }
                className="press flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-base font-medium text-muted-foreground hover:border-primary/50 hover:text-primary"
              >
                <Plus className="h-4 w-4" /> Add checklist item
              </button>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Payment & timing">
            <div className="grid gap-4">
              <label>
                <span className={labelCls()}>Payment (INR)</span>
                <input
                  className={inputCls}
                  type="number"
                  value={payment}
                  onChange={(e) => setPayment(Number(e.target.value))}
                />
              </label>
              <label>
                <span className={labelCls()}>Estimated time (minutes)</span>
                <input
                  className={inputCls}
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </label>
              <label>
                <span className={labelCls()}>Deadline</span>
                <input
                  className={inputCls}
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </label>
              <div>
                <span className={labelCls()}>Priority</span>
                <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
                  {["low", "normal", "high", "urgent"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={cn(
                        "rounded-lg py-2.5 text-[15px] font-medium capitalize transition-all",
                        priority === p
                          ? "bg-card shadow-soft"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Summary">
            <dl className="space-y-3 text-base">
              {[
                ["Checklist items", String(items.length)],
                ["Media required", String(items.reduce((n, i) => n + i.required.length, 0))],
                ["Escrow hold", formatCurrency(escrowAmount)],
                ["Platform fee", formatCurrency(Math.round(payment * 0.04))],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <button
              disabled={state === "saving"}
              onClick={() => {
                setState("saving");
                setTimeout(() => {
                  const demoJobs = getStoredDemoJobs();
                  const createdJob = {
                    id: `demo-${Date.now()}`,
                    ref: `GF-${Math.floor(1000 + Math.random() * 9000)}`,
                    title,
                    category,
                    description,
                    location,
                    distanceKm: 1.4,
                    payment,
                    estimatedMinutes: minutes,
                    deadline: deadline.replace("T", " at "),
                    priority: priority as "low" | "normal" | "high" | "urgent",
                    status: "open" as const,
                    postedAgo: "Just now",
                    checklist: items.map((item, index) => ({
                      id: `demo-${index + 1}`,
                      title: item.title || `Checklist item ${index + 1}`,
                      instructions: item.instructions || "Complete the requested evidence.",
                      required: item.required,
                      done: false,
                      captured: 0,
                    })),
                  };
                  saveDemoJobs([createdJob as unknown as typeof createdJob, ...demoJobs]);
                  setState("posted");
                }, 1100);
              }}
              className="press gradient-brand shadow-glow mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold text-primary-foreground"
            >
              {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
              Post job & fund escrow
            </button>
            <p className="mt-3 text-base text-muted-foreground">
              Workers see only your "Verified Client" badge. No contact details are shared.
            </p>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
