import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  GripVertical,
  Layers,
  Loader2,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { cn, formatCurrency } from "@/lib/utils";
import { api, ApiError, type Job } from "@/lib/api";
import { PageHeader } from "@/components/shell/portal-shell";
import { LocationPicker } from "@/components/location-picker";
import { SectionCard, SuccessCheck } from "@/components/marketplace/primitives";

export const Route = createFileRoute("/client/jobs/new")({
  head: () => ({
    meta: [
      { title: "Create a job — NetworkPeers client" },
      {
        name: "description",
        content:
          "Post a field job with a validated location, budget, schedule, infinite task builder, and evidence checklist.",
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

type AttachedFile = {
  name: string;
  size: number;
  type: string;
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

const MAX_CHECKLIST_ITEMS = 5000;
const PAGE_SIZE = 25;

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return "Unable to post the job. Check your connection and try again.";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CreateJob() {
  const router = useRouter();
  const idempotencyKeyRef = useRef<string | null>(null);

  // Job Basics State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(jobCategories[0]);
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState("");
  const [publicTitle, setPublicTitle] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [paymentInput, setPaymentInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // Worker Capacity Mode (§24)
  const [capacityMode, setCapacityMode] = useState<"single" | "team" | "unlimited">("single");
  const [teamSize, setTeamSize] = useState("5");

  // Attached Reference Media (§24)
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Task Builder Mode (§24)
  const [builderMode, setBuilderMode] = useState<"standard" | "book">("standard");
  const [bookStartPage, setBookStartPage] = useState("1");
  const [bookEndPage, setBookEndPage] = useState("20");
  const [bookPagePrefix, setBookPagePrefix] = useState("Page");
  const [bookRequireAll, setBookRequireAll] = useState(true);

  // Subtasks State
  const [items, setItems] = useState<DraftSubtask[]>([
    {
      id: 1,
      title: "Capture storefront evidence",
      instructions: "Capture the full signage and entrance.",
      isRequired: true,
    },
  ]);
  const [countInput, setCountInput] = useState(String(items.length));
  const [taskSearch, setTaskSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Submission State
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "posted">("idle");
  const [createdJob, setCreatedJob] = useState<Job | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
    setItems((previous) => {
      const next = previous.filter((item) => item.id !== id);
      setCountInput(String(next.length));
      return next;
    });
  }, []);

  const addSubtask = useCallback(() => {
    setItems((previous) => {
      if (previous.length >= MAX_CHECKLIST_ITEMS) {
        toast.error(`Maximum checklist limit of ${MAX_CHECKLIST_ITEMS} items reached.`);
        return previous;
      }
      const next = [
        ...previous,
        { id: Date.now() + Math.floor(Math.random() * 1000), title: "", instructions: "", isRequired: true },
      ];
      setCountInput(String(next.length));
      return next;
    });
  }, []);

  const addMultipleSubtasks = useCallback((amount: number) => {
    setItems((previous) => {
      const remaining = MAX_CHECKLIST_ITEMS - previous.length;
      if (remaining <= 0) {
        toast.error(`Maximum checklist limit of ${MAX_CHECKLIST_ITEMS} reached.`);
        return previous;
      }
      const toAdd = Math.min(amount, remaining);
      const nextId = previous.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      const added: DraftSubtask[] = Array.from({ length: toAdd }, (_, index) => ({
        id: nextId + index,
        title: "",
        instructions: "",
        isRequired: true,
      }));
      const next = [...previous, ...added];
      setCountInput(String(next.length));
      toast.success(`Added ${toAdd} checklist items.`);
      return next;
    });
  }, []);

  const resizeItems = useCallback((count: number) => {
    const clamped = Math.max(
      0,
      Math.min(MAX_CHECKLIST_ITEMS, Math.floor(Number.isFinite(count) ? count : 0)),
    );
    setItems((previous) => {
      if (clamped === previous.length) return previous;
      if (clamped < previous.length) return previous.slice(0, clamped);
      const nextId = previous.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      const added = Array.from({ length: clamped - previous.length }, (_, index) => ({
        id: nextId + index,
        title: "",
        instructions: "",
        isRequired: true,
      }));
      return [...previous, ...added];
    });
    return clamped;
  }, []);

  const handleCountChange = useCallback(
    (raw: string) => {
      setCountInput(raw);
      const clamped = resizeItems(Number.parseInt(raw, 10));
      setCountInput(String(clamped));
    },
    [resizeItems],
  );

  const handleBudgetChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentInput(normalizeWholeAmount(event.target.value));
  }, []);

  // Book Mode Generator (§24)
  const handleGenerateBookPages = useCallback(() => {
    const start = Number.parseInt(bookStartPage, 10);
    const end = Number.parseInt(bookEndPage, 10);
    if (!Number.isInteger(start) || start < 1) {
      toast.error("Start page must be a positive integer (e.g. 1).");
      return;
    }
    if (!Number.isInteger(end) || end < start) {
      toast.error("End page must be greater than or equal to start page.");
      return;
    }
    const pageCount = end - start + 1;
    if (pageCount > MAX_CHECKLIST_ITEMS) {
      toast.error(`Cannot generate more than ${MAX_CHECKLIST_ITEMS} pages at once.`);
      return;
    }

    const prefix = bookPagePrefix.trim() || "Page";
    const generated: DraftSubtask[] = [];
    const baseId = Date.now();

    for (let page = start; page <= end; page++) {
      generated.push({
        id: baseId + (page - start),
        title: `${prefix} ${page}`,
        instructions: `Capture a clear, well-lit photograph of ${prefix.toLowerCase()} ${page}. Verify all margins and text are sharp and legible.`,
        isRequired: bookRequireAll,
      });
    }

    setItems(generated);
    setCountInput(String(generated.length));
    setCurrentPage(1);
    toast.success(`Generated ${pageCount} checklist tasks for ${prefix} ${start} to ${end}.`);
  }, [bookEndPage, bookPagePrefix, bookRequireAll, bookStartPage]);

  const markAllRequired = useCallback((required: boolean) => {
    setItems((previous) => previous.map((item) => ({ ...item, isRequired: required })));
    toast.success(required ? "All items marked required." : "All items marked optional.");
  }, []);

  const clearAllSubtasks = useCallback(() => {
    setItems([]);
    setCountInput("0");
    setCurrentPage(1);
    toast.info("Cleared all checklist items.");
  }, []);

  // File Upload Handlers
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: AttachedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 25 MB platform limit.`);
        continue;
      }
      added.push({
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
      });
    }
    if (added.length > 0) {
      setAttachments((previous) => [...previous, ...added]);
      toast.success(`Attached ${added.length} reference file(s).`);
    }
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((previous) => previous.filter((_, i) => i !== index));
  }, []);

  // Filtered & Paginated items for high-volume performance (§24)
  const filteredItems = useMemo(() => {
    if (!taskSearch.trim()) return items;
    const q = taskSearch.toLowerCase();
    return items.filter(
      (item) => item.title.toLowerCase().includes(q) || item.instructions.toLowerCase().includes(q),
    );
  }, [items, taskSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredItems]);

  const handleSubmit = useCallback(async () => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const normalizedAddress = address.trim();

    if (normalizedTitle.length < 3) {
      setFormError("Job title must contain at least 3 characters.");
      return;
    }
    if (normalizedDescription.length < 10) {
      setFormError("Description must contain at least 10 characters.");
      return;
    }
    const normalizedPublicTitle = publicTitle.trim();
    if (normalizedPublicTitle && normalizedPublicTitle.length < 3) {
      setFormError("Public title must contain at least 3 characters.");
      return;
    }
    if (!Number.isSafeInteger(budgetCents) || budgetCents <= 0 || budgetCents > 1_000_000_000) {
      setFormError("Payment must be a whole INR amount between ₹1 and ₹10,000,000.");
      return;
    }
    if (!location) {
      setFormError("Tap the map to set the job location before posting.");
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

    // Capacity and attachment notes
    const capacityNote =
      capacityMode === "team"
        ? `\n[Staffing: Capped Team (${teamSize} workers)]`
        : capacityMode === "unlimited"
          ? "\n[Staffing: Open Pool / Multi-Worker]"
          : "\n[Staffing: Single Assigned Worker]";

    const attachmentsNote =
      attachments.length > 0
        ? `\n[Attached Reference Files: ${attachments.map((a) => a.name).join(", ")}]`
        : "";

    const combinedDescription = `${normalizedDescription}${capacityNote}${attachmentsNote}`;

    setFormError(null);
    setSubmitState("saving");
    try {
      idempotencyKeyRef.current ??= globalThis.crypto.randomUUID();
      const job = await api.createClientJob({
        title: normalizedTitle,
        description: combinedDescription,
        category,
        budget_cents: budgetCents,
        currency: "INR",
        location: { type: "Point", coordinates: [location.lng, location.lat] },
        ...(normalizedAddress ? { address: normalizedAddress } : {}),
        ...(deadlineIso ? { scheduled_at: deadlineIso } : {}),
        idempotency_key: idempotencyKeyRef.current,
        public_title: normalizedPublicTitle || normalizedTitle,
        public_description: publicDescription.trim() || normalizedDescription.slice(0, 2000),
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
  }, [
    address,
    attachments,
    budgetCents,
    capacityMode,
    category,
    description,
    items,
    location,
    publicDescription,
    publicTitle,
    scheduledAt,
    teamSize,
    title,
  ]);

  const postAnother = useCallback(() => {
    idempotencyKeyRef.current = null;
    setCreatedJob(null);
    setSubmitState("idle");
    setTitle("");
    setDescription("");
    setAddress("");
    setPublicTitle("");
    setPublicDescription("");
    setPaymentInput("");
    setScheduledAt("");
    setAttachments([]);
    setItems([
      {
        id: 1,
        title: "Capture storefront evidence",
        instructions: "Capture the full signage and entrance.",
        isRequired: true,
      },
    ]);
    setCountInput("1");
    setCurrentPage(1);
  }, []);

  if (submitState === "posted" && createdJob) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
        <SuccessCheck />
        <h1 className="mt-6 text-4xl font-semibold">Job created</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {formatCurrency(createdJob.budget_cents / 100)} is awaiting escrow funding with status{" "}
          <span className="font-semibold text-foreground">{createdJob.status}</span>.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.navigate({ to: "/client/jobs" })}
            className="press gradient-brand inline-flex rounded-xl px-4 py-2.5 text-base font-semibold text-primary-foreground shadow-md"
          >
            View my jobs
          </button>
          <button
            type="button"
            onClick={postAnother}
            className="press rounded-xl border border-border bg-card px-4 py-2.5 text-base font-semibold transition hover:border-primary/40"
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
        description="Define the work, a precise location, and checklist evidence requirements."
        action={
          <Link
            to="/client/jobs"
            className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-base font-medium transition hover:border-primary/40"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* Job Basics */}
          <SectionCard title="Job basics" description="All fields are validated again by the API.">
            <div className="grid gap-4">
              <label>
                <span className={labelCls()}>Job title</span>
                <input
                  className={inputCls}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={255}
                  placeholder="e.g. Rare Manuscript Digitization & Verification"
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
              <label>
                <span className={labelCls()}>Job location</span>
                <LocationPicker
                  lat={location?.lat ?? null}
                  lng={location?.lng ?? null}
                  onPick={(nextLat, nextLng) => setLocation({ lat: nextLat, lng: nextLng })}
                />
              </label>
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

          {/* Worker Capacity & Staffing (§24) */}
          <SectionCard
            title="Worker capacity & staffing"
            description="Configure how many verified field collectionists can participate in this task."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setCapacityMode("single")}
                className={cn(
                  "press flex flex-col items-start rounded-2xl border p-4 text-left transition",
                  capacityMode === "single"
                    ? "border-amber-400 bg-amber-400/10 shadow-sm"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <Users className="h-5 w-5 text-amber-500" />
                <span className="mt-2 text-base font-semibold">Single Worker</span>
                <span className="text-xs text-muted-foreground">1 assigned collectionist</span>
              </button>

              <button
                type="button"
                onClick={() => setCapacityMode("team")}
                className={cn(
                  "press flex flex-col items-start rounded-2xl border p-4 text-left transition",
                  capacityMode === "team"
                    ? "border-amber-400 bg-amber-400/10 shadow-sm"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <Layers className="h-5 w-5 text-amber-500" />
                <span className="mt-2 text-base font-semibold">Capped Team</span>
                <span className="text-xs text-muted-foreground">Up to N workers simultaneously</span>
              </button>

              <button
                type="button"
                onClick={() => setCapacityMode("unlimited")}
                className={cn(
                  "press flex flex-col items-start rounded-2xl border p-4 text-left transition",
                  capacityMode === "unlimited"
                    ? "border-amber-400 bg-amber-400/10 shadow-sm"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span className="mt-2 text-base font-semibold">Open Pool</span>
                <span className="text-xs text-muted-foreground">Distributed multi-worker units</span>
              </button>
            </div>

            {capacityMode === "team" && (
              <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
                <label className="flex items-center gap-3">
                  <span className="text-sm font-medium">Maximum concurrent workers:</span>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="h-9 w-20 rounded-lg border border-border bg-card text-center text-base font-semibold outline-none focus:ring-2 focus:ring-ring/40"
                  />
                  <span className="text-xs text-muted-foreground">Between 2 and 100 workers</span>
                </label>
              </div>
            )}
          </SectionCard>

          {/* Reference Media Upload (§24) */}
          <SectionCard
            title="Reference media & guidelines"
            description="Attach guidelines, sample pages, or reference documents for field workers."
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="press flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-6 text-center transition hover:border-amber-400 hover:bg-amber-400/5"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <span className="font-semibold text-foreground">Click to upload reference files</span>
                <span className="text-muted-foreground"> or drag & drop</span>
              </div>
              <p className="text-xs text-muted-foreground">PDF, JPEG, PNG, or WebP up to 25 MB each</p>
            </button>

            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">
                  Attached files ({attachments.length}):
                </p>
                {attachments.map((file, idx) => (
                  <div
                    key={file.name + idx}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 shrink-0 text-amber-500" />
                      <span className="truncate text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="press rounded-lg p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remove attachment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Public Preview */}
          <SectionCard
            title="What workers will see"
            description="Workers see this anonymized version until they are assigned the job. Leave blank to show your title and description."
          >
            <div className="grid gap-4">
              <label>
                <span className={labelCls()}>Public title</span>
                <input
                  className={inputCls}
                  value={publicTitle}
                  onChange={(event) => setPublicTitle(event.target.value)}
                  maxLength={255}
                  placeholder={title.trim() || "e.g. Photography task near you"}
                />
              </label>
              <label>
                <span className={labelCls()}>Public description</span>
                <textarea
                  rows={3}
                  className={inputCls}
                  value={publicDescription}
                  onChange={(event) => setPublicDescription(event.target.value)}
                  maxLength={2000}
                  placeholder="Privacy-safe summary. Keep exact addresses and business names out of this field."
                />
              </label>
            </div>
          </SectionCard>

          {/* Infinite Task Builder & Book Mode (§24) */}
          <SectionCard
            title="Checklist & task builder"
            description="Infinite scaling task builder with Book / Sequential Mode for document verification."
          >
            {/* Mode Switcher */}
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-muted/20 p-1.5">
              <button
                type="button"
                onClick={() => setBuilderMode("standard")}
                className={cn(
                  "press flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition",
                  builderMode === "standard"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <CheckSquare className="h-4 w-4" /> Standard Checklist
              </button>
              <button
                type="button"
                onClick={() => setBuilderMode("book")}
                className={cn(
                  "press flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition",
                  builderMode === "book"
                    ? "bg-amber-400 text-slate-900 shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <BookOpen className="h-4 w-4" /> Book / Document Mode
              </button>
            </div>

            {/* Book Mode Generator Panel */}
            {builderMode === "book" && (
              <div className="mb-4 space-y-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h4 className="text-base font-semibold text-foreground">
                    Auto-Generate Sequential Page Tasks
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Quickly generate verification tasks for an entire document or book. Each page is added as an individually verifiable task with Devanagari/English script validation.
                </p>

                <div className="grid gap-3 sm:grid-cols-4">
                  <label>
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">
                      Start Page
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={MAX_CHECKLIST_ITEMS}
                      value={bookStartPage}
                      onChange={(e) => setBookStartPage(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">
                      End Page
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={MAX_CHECKLIST_ITEMS}
                      value={bookEndPage}
                      onChange={(e) => setBookEndPage(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">
                      Prefix Label
                    </span>
                    <input
                      type="text"
                      value={bookPagePrefix}
                      onChange={(e) => setBookPagePrefix(e.target.value)}
                      placeholder="Page"
                      className={inputCls}
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleGenerateBookPages}
                      className="press h-12 w-full rounded-xl bg-amber-400 px-4 text-sm font-bold text-slate-900 shadow-sm hover:bg-amber-300"
                    >
                      Generate Tasks
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bookRequireAll}
                    onChange={(e) => setBookRequireAll(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Mark all generated pages as strictly required for completion</span>
                </label>
              </div>
            )}

            {/* Quick Actions & High Volume Toolbar */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Quick add:</span>
                  <button
                    type="button"
                    onClick={() => addMultipleSubtasks(1)}
                    className="press rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold hover:border-primary/40"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => addMultipleSubtasks(10)}
                    className="press rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold hover:border-primary/40"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => addMultipleSubtasks(50)}
                    className="press rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold hover:border-primary/40"
                  >
                    +50
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markAllRequired(true)}
                    className="press rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium hover:border-primary/40"
                  >
                    Require all
                  </button>
                  <button
                    type="button"
                    onClick={() => markAllRequired(false)}
                    className="press rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium hover:border-primary/40"
                  >
                    Optional all
                  </button>
                  <button
                    type="button"
                    onClick={clearAllSubtasks}
                    className="press rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-destructive hover:border-destructive/40"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              {/* Search & Pagination Info */}
              {items.length > PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={taskSearch}
                      onChange={(e) => {
                        setTaskSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search tasks by title or instructions..."
                      className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Page {currentPage} of {totalPages} ({filteredItems.length} tasks)
                    </span>
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="press rounded-lg border border-border bg-card p-1.5 disabled:opacity-40"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="press rounded-lg border border-border bg-card p-1.5 disabled:opacity-40"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Task Items List */}
              {paginatedItems.map((item, index) => {
                const actualIndex = (currentPage - 1) * PAGE_SIZE + index;
                return (
                  <div key={item.id} className="rounded-2xl border border-border bg-muted/30 p-4 transition-all">
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="truncate text-[15px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Task {actualIndex + 1}
                        {item.title && <span className="ml-2 lowercase text-foreground">— {item.title}</span>}
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
                        placeholder="Task name (e.g. Page 1 or Signage)"
                      />
                      <textarea
                        rows={2}
                        value={item.instructions}
                        onChange={(event) =>
                          updateSubtask(item.id, { instructions: event.target.value })
                        }
                        className={inputCls}
                        maxLength={2000}
                        placeholder="Specific instructions for evidence capture"
                      />
                      <label className="flex items-center gap-2 text-base font-medium">
                        <input
                          type="checkbox"
                          checked={item.isRequired}
                          onChange={(event) =>
                            updateSubtask(item.id, { isRequired: event.target.checked })
                          }
                        />
                        Evidence required before task submission
                      </label>
                    </div>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
                  <CheckSquare className="mx-auto h-8 w-8 opacity-40" />
                  <p className="mt-2 font-medium">No tasks defined yet.</p>
                  <p className="text-sm">Add tasks using the buttons above or generate a book checklist.</p>
                </div>
              )}

              <button
                type="button"
                onClick={addSubtask}
                className="press flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-base font-medium text-muted-foreground hover:border-amber-400 hover:text-amber-500"
              >
                <Plus className="h-4 w-4" /> Add checklist item
              </button>
            </div>
          </SectionCard>
        </div>

        {/* Sidebar: Budget, Timing & Summary */}
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
                [
                  "Staffing mode",
                  capacityMode === "single"
                    ? "Single Worker"
                    : capacityMode === "team"
                      ? `Capped Team (${teamSize})`
                      : "Open Pool",
                ],
                ["Reference files", String(attachments.length)],
                ["Job budget", formatCurrency(paymentRupees)],
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
              Once posted, deposit budget to escrow to immediately dispatch to verified field collectionists.
            </p>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
