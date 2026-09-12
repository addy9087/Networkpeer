import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/portal-shell";
import { Chip, EmptyState, SectionCard } from "@/components/marketplace/primitives";
import { api, ApiError, type AdminUserSummary } from "@/lib/api";

export const Route = createFileRoute("/admin/workers")({
  head: () => ({
    meta: [
      { title: "Admin workers — NetworkPeers" },
      { name: "description", content: "Worker verification and operational status." },
    ],
  }),
  component: AdminWorkers,
});

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return "Unable to load workers. Check your connection and try again.";
}

function AdminWorkers() {
  const [workers, setWorkers] = useState<AdminUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.adminUsers({ role: "WORKER", perPage: 100 });
      setWorkers(result.items);
      setError(null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return workers.filter((worker) =>
      `${worker.full_name} ${worker.phone_number}`.toLowerCase().includes(term),
    );
  }, [workers, query]);

  const verifyWorker = useCallback(
    async (workerId: string) => {
      setUpdatingId(workerId);
      try {
        await api.adminSetWorkerVerification(
          workerId,
          "VERIFIED",
          true,
          "Approved via admin console",
        );
        await load();
        toast.success("Worker verified for active work.");
      } catch (requestError) {
        toast.error(errorMessage(requestError));
      } finally {
        setUpdatingId(null);
      }
    },
    [load],
  );

  const suspendWorker = useCallback(
    async (workerId: string) => {
      setUpdatingId(workerId);
      try {
        await api.adminSetWorkerVerification(workerId, "SUSPENDED", false, "Suspended for review");
        await load();
        toast.success("Worker suspended for review.");
      } catch (requestError) {
        toast.error(errorMessage(requestError));
      } finally {
        setUpdatingId(null);
      }
    },
    [load],
  );

  const toggleCorrectionistRole = useCallback(
    async (workerId: string, action: "grant" | "revoke") => {
      setUpdatingId(workerId);
      try {
        await api.adminSetWorkerRole(workerId, "correctionist", action);
        await load();
        toast.success(
          action === "grant"
            ? "Granted Correctionist role to worker."
            : "Revoked Correctionist role from worker.",
        );
      } catch (requestError) {
        toast.error(errorMessage(requestError));
      } finally {
        setUpdatingId(null);
      }
    },
    [load],
  );

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        title="Worker management"
        description="Review worker verification status and operational access."
      />

      <SectionCard title="All workers" description="Search and manage worker trust levels and correctionist roles">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="Search by name or phone"
            />
          </div>
          <div className="text-base text-muted-foreground">{filtered.length} visible workers</div>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No workers found"
            description="Try another search term."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-base">
              <thead className="text-sm uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Worker</th>
                  <th className="px-3 py-3">Mobile (Unverified)</th>
                  <th className="px-3 py-3">Roles</th>
                  <th className="px-3 py-3">Verification</th>
                  <th className="px-3 py-3">Active jobs</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((worker) => {
                  const status = worker.workerProfile?.verificationStatus ?? "PENDING";
                  const isUpdating = updatingId === worker.id;
                  const isCorrectionist =
                    worker.workerProfile?.eligibleRoles?.includes("correctionist") ?? false;
                  return (
                    <tr key={worker.id} className="border-t border-border/70 align-middle">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-base font-semibold text-primary">
                            {worker.full_name?.charAt(0)?.toUpperCase() ?? "W"}
                          </div>
                          <div>
                            <p className="font-semibold">{worker.full_name || "Worker"}</p>
                            <p className="text-sm text-muted-foreground">{worker.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">{worker.phone_number}</span>
                          <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground font-mono">
                            unverified
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                            Collectionist
                          </span>
                          {isCorrectionist ? (
                            <span className="rounded-md bg-primary/20 text-primary px-2 py-0.5 text-xs font-semibold">
                              Correctionist
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Chip
                          tone={
                            status === "VERIFIED"
                              ? "success"
                              : status === "SUSPENDED"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {status}
                        </Chip>
                      </td>
                      <td className="px-3 py-3">{worker.activeJobCount}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {isCorrectionist ? (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void toggleCorrectionistRole(worker.id, "revoke")}
                              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 disabled:opacity-60"
                            >
                              {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Revoke Correctionist"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void toggleCorrectionistRole(worker.id, "grant")}
                              className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-60"
                            >
                              {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Grant Correctionist"}
                            </button>
                          )}
                          {status !== "VERIFIED" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void verifyWorker(worker.id)}
                              className="rounded-lg border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success disabled:opacity-60"
                            >
                              Verify
                            </button>
                          )}
                          {status !== "SUSPENDED" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void suspendWorker(worker.id)}
                              className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive disabled:opacity-60"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
