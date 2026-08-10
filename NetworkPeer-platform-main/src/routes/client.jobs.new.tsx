import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn, formatCurrency } from "@/lib/utils";
import { api, ApiError, type Job } from "@/lib/api";
import { PageHeader } from "@/components/shell/portal-shell";
import { SectionCard, SuccessCheck } from "@/components/marketplace/primitives";

export const Route = createFileRoute("/client/jobs/new")({
  head: () => ({
    meta: [
      { title: "Create a job — NetworkPeers client" },
      {
        name: "description",
        content:
          "Post a field job with a validated location, budget, schedule, and evidence checklist.",
      },
    ],
  }),
  component: CreateJob,
});

type DraftSubtask = {
  id: number;
  title: string;
  instructions: string;
  isRequired: boolean;
};

const jobCategories = ["Audit", "Delivery", "Inspection", "Photography", "Retail", "Other"];
const inputCls =
  "w-full rounded-xl border border-border bg-card px-3.5 py-3 text-base outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40";

function labelCls() {
  return "mb-1.5 block text-base font-medium";
}

function normalizeWholeAmount(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 0 ? "" : String(Number.parseInt(digits, 10));
}

function parseCoordinate(value: string, minimum: number, maximum: number): number | null {
  if (value.trim() === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : null;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return "Unable to post the job. Check your connection and try again.";
}

function CreateJob() {
  const router = useRouter();
  const idempotencyKeyRef = useRef<string | null>(null);
  const [items, setItems] = useState<DraftSubtask[]>([
    {
      id: 1,
      title: "Capture storefront evidence",
      instructions: "Capture the full signage and entrance.",
      isRequired: true,
    },
  ]);
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "posted">("idle");
  const [createdJob, setCreatedJob] = useState<Job | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(jobCategories[0]);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [description, setDescription] = useState("");
  const [paymentInput, setPaymentInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const paymentRupees = useMemo(
    () => (paymentInput === "" ? 0 : Number.parseInt(paymentInput, 10)),
    [paymentInput],
  );
  const budgetCents = useMemo(() => paymentRupees * 100, [paymentRupees]);
  const checklistSummary = useMemo(
    () => ({
      total: items.length,
      required: items.filter((item) => item.isRequired).length,
    }),
    [items],
  );

  const updateSubtask = useCallback((id: number, patch: Partial<DraftSubtask>) => {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const removeSubtask = useCallback((id: number) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const addSubtask = useCallback(() => {
    setItems((previous) => [
      ...previous,
      { id: Date.now(), title: "", instructions: "", isRequired: true },
    ]);
  }, []);

  const handleBudgetChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentInput(normalizeWholeAmount(event.target.value));
  }, []);

  const handleSubmit = useCallback(async () => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const normalizedAddress = address.trim();
    const parsedLatitude = parseCoordinate(latitude, -90, 90);
    const parsedLongitude = parseCoordinate(longitude, -180, 180);

    if (normalizedTitle.length < 3) {
      setFormError("Job title must contain at least 3 characters.");
      return;
    }
    if (normalizedDescription.length < 10) {
      setFormError("Description must contain at least 10 characters.");
      return;
    }
    if (!Number.isSafeInteger(budgetCents) || budgetCents <= 0 || budgetCents > 1_000_000_000) {
      setFormError("Payment must be a whole INR amount between ₹1 and ₹10,000,000.");
      return;
    }
    if (parsedLatitude === null || parsedLongitude === null) {
      setFormError("Enter valid latitude (-90 to 90) and longitude (-180 to 180) values.");
      return;
    }

    const populatedItems = items.filter((item) => item.title.trim() || item.instructions.trim());
    if (populatedItems.some((item) => item.title.trim().length === 0)) {
      setFormError("Every checklist item with instructions needs a title.");
      return;
    }

    let deadlineIso: string | undefined;
    if (scheduledAt) {
      const deadline = new Date(scheduledAt);
      if (Number.isNaN(deadline.getTime())) {
        setFormError("Enter a valid scheduled date and time.");
        return;
      }
      deadlineIso = deadline.toISOString();
    }

    setFormError(null);
    setSubmitState("saving");
    try {
      idempotencyKeyRef.current ??= globalThis.crypto.randomUUID();
      const job = await api.createClientJob({
        title: normalizedTitle,
        description: normalizedDescription,
        category,
        budget_cents: budgetCents,
        currency: "INR",
        location: { type: "Point", coordinates: [parsedLongitude, parsedLatitude] },
        ...(normalizedAddress ? { address: normalizedAddress } : {}),
        ...(deadlineIso ? { scheduled_at: deadlineIso } : {}),
        idempotency_key: idempotencyKeyRef.current,
        subtasks: populatedItems.map((item) => ({
          title: item.title.trim(),
          ...(item.instructions.trim() ? { description: item.instructions.trim() } : {}),
          is_required: item.isRequired,
        })),
      });
      setCreatedJob(job);
      setSubmitState("posted");
      toast.success("Job created. Fund escrow to publish it to verified workers.");
    } catch (error) {
      const message = errorMessage(error);
      setFormError(message);
      toast.error(message);
      setSubmitState("idle");
    }
  }, [address, budgetCents, category, description, items, latitude, longitude, scheduledAt, title]);

  const postAnother = useCallback(() => {
    idempotencyKeyRef.current = null;
    setCreatedJob(null);
    setSubmitState("idle");
  }, []);

  if (submitState === "posted" && createdJob) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
        <SuccessCheck />
        <h1 className="mt-6 text-4xl font-semibold">Job created</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {formatCurrency(createdJob.budget_cents / 100)} is awaiting escrow funding with status{" "}
          {createdJob.status}.
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
            type="button"
            onClick={postAnother}
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
        description="Define the work, a precise location, and which checklist evidence is required."
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
          <SectionCard title="Job basics" description="All fields are validated again by the API.">
            <div className="grid gap-4">
              <label>
                <span className={labelCls()}>Job title</span>
                <input
                  className={inputCls}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={255}
                  placeholder="e.g. Storefront compliance audit"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className={labelCls()}>Category</span>
                  <select
                    className={inputCls}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {jobCategories.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelCls()}>Address (optional)</span>
                  <input
                    className={inputCls}
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    maxLength={500}
                    placeholder="412 Market St, Downtown"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className={labelCls()}>Latitude</span>
                  <input
                    className={inputCls}
                    inputMode="decimal"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    placeholder="e.g. 19.0760"
                  />
                </label>
                <label>
                  <span className={labelCls()}>Longitude</span>
                  <input
                    className={inputCls}
                    inputMode="decimal"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    placeholder="e.g. 72.8777"
                  />
                </label>
              </div>
              <p className="-mt-2 text-sm text-muted-foreground">
                Coordinates are sent as GeoJSON in backend-required order: longitude, then latitude.
              </p>
              <label>
                <span className={labelCls()}>Description</span>
                <textarea
                  rows={4}
                  className={inputCls}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={10_000}
                  placeholder="Describe the task, access instructions, and anything the worker should know."
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="Checklist builder"
            description="Required items are enforced by the worker evidence submission workflow."
          >
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-[15px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Task {index + 1}
                    </p>
                    <button
                      type="button"
                      aria-label="Remove task"
                      onClick={() => removeSubtask(item.id)}
                      className="press grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <input
                      value={item.title}
                      onChange={(event) => updateSubtask(item.id, { title: event.target.value })}
                      className={inputCls}
                      maxLength={255}
                      placeholder="Task name"
                    />
                    <textarea
                      rows={2}
                      value={item.instructions}
                      onChange={(event) =>
                        updateSubtask(item.id, { instructions: event.target.value })
                      }
                      className={inputCls}
                      maxLength={2000}
                      placeholder="Instructions for the worker"
                    />
                    <label className="flex items-center gap-2 text-base font-medium">
                      <input
                        type="checkbox"
                        checked={item.isRequired}
                        onChange={(event) =>
                          updateSubtask(item.id, { isRequired: event.target.checked })
                        }
                      />
                      Evidence required before submission
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addSubtask}
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={paymentInput}
                  onChange={handleBudgetChange}
                  placeholder="e.g. 500"
                  aria-describedby="budget-help"
                />
                <span id="budget-help" className="mt-1.5 block text-sm text-muted-foreground">
                  Whole rupees only. Sent to the API as {budgetCents.toLocaleString("en-IN")} cents.
                </span>
              </label>
              <label>
                <span className={labelCls()}>Scheduled time (optional)</span>
                <input
                  className={inputCls}
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard title="Summary">
            <dl className="space-y-3 text-base">
              {[
                ["Checklist items", String(checklistSummary.total)],
                ["Evidence required", String(checklistSummary.required)],
                ["Job budget", formatCurrency(paymentRupees)],
                ["Platform fee", formatCurrency(0)],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {formError && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
              >
                {formError}
              </p>
            )}
            <button
              type="button"
              disabled={submitState === "saving"}
              onClick={() => void handleSubmit()}
              className={cn(
                "press gradient-brand shadow-glow mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold text-primary-foreground",
                submitState === "saving" && "cursor-not-allowed opacity-70",
              )}
            >
              {submitState === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
              Post job
            </button>
            <p className="mt-3 text-sm text-muted-foreground">
              This form submits only fields the current backend supports. Client reference-file
              uploads and media-type rules are not exposed by the API yet.
            </p>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
