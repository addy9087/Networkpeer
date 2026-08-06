import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, Search, ShieldCheck, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/portal-shell";
import { Chip, EmptyState, SectionCard } from "@/components/marketplace/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/workers")({
  head: () => ({
    meta: [
      { title: "Admin workers — NetworkPeers" },
      { name: "description", content: "Worker quality, reliability and trust signals." },
    ],
  }),
  component: AdminWorkers,
});

type WorkerStatus = "Approved" | "Pending" | "Suspended" | "Banned";

type Worker = {
  id: string;
  name: string;
  photo: string;
  rating: number;
  completedJobs: number;
  currentJob: string;
  verification: string;
  wallet: string;
  status: WorkerStatus;
};

const seedWorkers: Worker[] = [
  {
    id: "WK-401",
    name: "A. Rivera",
    photo: "AR",
    rating: 4.9,
    completedJobs: 137,
    currentJob: "Retail audit",
    verification: "Verified",
    wallet: "₹860K",
    status: "Approved",
  },
  {
    id: "WK-402",
    name: "L. Chen",
    photo: "LC",
    rating: 4.8,
    completedJobs: 102,
    currentJob: "Photography",
    verification: "Verified",
    wallet: "₹640K",
    status: "Pending",
  },
  {
    id: "WK-403",
    name: "M. Singh",
    photo: "MS",
    rating: 4.6,
    completedJobs: 51,
    currentJob: "Merchandising",
    verification: "Review",
    wallet: "₹220K",
    status: "Suspended",
  },
];

function AdminWorkers() {
  const [workers, setWorkers] = useState(seedWorkers);
  const [query, setQuery] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [mode, setMode] = useState<"view" | "confirm">("view");
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "suspend" | "ban" | "delete" | null
  >(null);

  const filteredWorkers = useMemo(() => {
    const term = query.toLowerCase();
    return workers.filter((worker) =>
      `${worker.name} ${worker.currentJob}`.toLowerCase().includes(term),
    );
  }, [workers, query]);

  const requestAction = (worker: Worker, action: "approve" | "suspend" | "ban" | "delete") => {
    setSelectedWorker(worker);
    setConfirmAction(action);
    setMode("confirm");
  };

  const applyAction = () => {
    if (!selectedWorker || !confirmAction) return;
    if (confirmAction === "approve") {
      setWorkers((prev) =>
        prev.map((worker) =>
          worker.id === selectedWorker.id
            ? { ...worker, status: "Approved" as WorkerStatus }
            : worker,
        ),
      );
      toast.success(`${selectedWorker.name} approved for active work.`);
    }
    if (confirmAction === "suspend") {
      setWorkers((prev) =>
        prev.map((worker) =>
          worker.id === selectedWorker.id
            ? { ...worker, status: "Suspended" as WorkerStatus }
            : worker,
        ),
      );
      toast.success(`${selectedWorker.name} suspended for review.`);
    }
    if (confirmAction === "ban") {
      setWorkers((prev) =>
        prev.map((worker) =>
          worker.id === selectedWorker.id
            ? { ...worker, status: "Banned" as WorkerStatus }
            : worker,
        ),
      );
      toast.success(`${selectedWorker.name} was banned from the marketplace.`);
    }
    if (confirmAction === "delete") {
      setWorkers((prev) => prev.filter((worker) => worker.id !== selectedWorker.id));
      toast.success(`${selectedWorker.name} removed from the mock workspace.`);
    }
    setSelectedWorker(null);
    setConfirmAction(null);
    setMode("view");
  };

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        title="Worker management"
        description="Review worker reliability, verification status and operational access."
      />

      <SectionCard title="All workers" description="Search and manage worker trust levels">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="Search by worker name"
            />
          </div>
          <div className="text-base text-muted-foreground">
            {filteredWorkers.length} visible workers
          </div>
        </div>

        {filteredWorkers.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No workers match this view"
            description="Try another search term or revisit the roster later."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-base">
              <thead className="text-sm uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Photo</th>
                  <th className="px-3 py-3">Worker ID</th>
                  <th className="px-3 py-3">Rating</th>
                  <th className="px-3 py-3">Completed Jobs</th>
                  <th className="px-3 py-3">Current Job</th>
                  <th className="px-3 py-3">Verification</th>
                  <th className="px-3 py-3">Wallet</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((worker) => (
                  <tr key={worker.id} className="border-t border-border/70 align-middle">
                    <td className="px-3 py-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-base font-semibold text-primary">
                        {worker.photo}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{worker.id}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 text-warning">
                        <Star className="h-4 w-4 fill-warning" />
                        {worker.rating.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-3 py-3">{worker.completedJobs}</td>
                    <td className="px-3 py-3">{worker.currentJob}</td>
                    <td className="px-3 py-3">
                      <Chip tone={worker.verification === "Verified" ? "success" : "warning"}>
                        {worker.verification}
                      </Chip>
                    </td>
                    <td className="px-3 py-3">{worker.wallet}</td>
                    <td className="px-3 py-3">
                      <Chip
                        tone={
                          worker.status === "Approved"
                            ? "success"
                            : worker.status === "Banned"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {worker.status}
                      </Chip>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedWorker(worker)}
                          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => requestAction(worker, "approve")}
                          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => requestAction(worker, "suspend")}
                          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium"
                        >
                          Suspend
                        </button>
                        <button
                          type="button"
                          onClick={() => requestAction(worker, "ban")}
                          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium"
                        >
                          Ban
                        </button>
                        <button
                          type="button"
                          onClick={() => requestAction(worker, "delete")}
                          className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-sm font-medium text-destructive"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Dialog
        open={Boolean(selectedWorker && mode === "view")}
        onOpenChange={(open) => !open && setSelectedWorker(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Worker overview</DialogTitle>
            <DialogDescription>Mock detail context for the selected worker.</DialogDescription>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-3 text-base">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-lg font-semibold text-primary">
                  {selectedWorker.photo}
                </div>
                <div>
                  <p className="font-semibold">{selectedWorker.name}</p>
                  <p className="text-muted-foreground">{selectedWorker.currentJob}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border px-3 py-3">
                <span className="text-muted-foreground">Rating</span>
                <span className="font-medium">{selectedWorker.rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border px-3 py-3">
                <span className="text-muted-foreground">Completed jobs</span>
                <span className="font-medium">{selectedWorker.completedJobs}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border px-3 py-3">
                <span className="text-muted-foreground">Wallet</span>
                <span className="font-medium">{selectedWorker.wallet}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedWorker && mode === "confirm")}
        onOpenChange={(open) => !open && setSelectedWorker(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "delete"
                ? "Delete worker"
                : confirmAction === "ban"
                  ? "Ban worker"
                  : confirmAction === "suspend"
                    ? "Suspend worker"
                    : "Approve worker"}
            </DialogTitle>
            <DialogDescription>
              These changes only affect mock state and are designed to feel realistic in the UI.
            </DialogDescription>
          </DialogHeader>
          {selectedWorker && (
            <div className="rounded-2xl border border-border bg-muted/40 p-3 text-base text-muted-foreground">
              {confirmAction === "delete"
                ? `Delete ${selectedWorker.name} from the mock admin workspace?`
                : confirmAction === "ban"
                  ? `Ban ${selectedWorker.name} and remove their operational access?`
                  : confirmAction === "suspend"
                    ? `Suspend ${selectedWorker.name} until a review is complete?`
                    : `Approve ${selectedWorker.name} for the next available assignment?`}
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={applyAction}
              className="press inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-base font-semibold text-primary-foreground"
            >
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
