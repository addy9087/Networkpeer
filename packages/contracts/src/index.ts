import { z } from "zod";

export const userRoleSchema = z.enum(["CLIENT", "WORKER", "ADMIN"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const jobStatusSchema = z.enum([
  "FUNDING",
  "POSTED",
  "ASSIGNED",
  "EN_ROUTE",
  "AT_LOCATION",
  "IN_PROGRESS",
  "SUBMITTED",
  "APPROVED",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const escrowStatusSchema = z.enum([
  "UNFUNDED",
  "PENDING",
  "HELD",
  "RELEASED",
  "FROZEN",
  "REFUNDED",
]);
export type EscrowStatus = z.infer<typeof escrowStatusSchema>;

export const mediaStatusSchema = z.enum(["PENDING", "UPLOADED", "VERIFIED", "REJECTED"]);
export type MediaStatus = z.infer<typeof mediaStatusSchema>;

export const mediaTypeSchema = z.enum(["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"]);
export type MediaType = z.infer<typeof mediaTypeSchema>;

export const syncTopicSchema = z.enum([
  "JOB_CREATED",
  "JOB_ASSIGNED",
  "JOB_STATUS_CHANGED",
  "JOB_CANCELLED",
  "JOB_REASSIGNED",
  "EVIDENCE_UPLOADED",
  "LEDGER_POSTED",
  "NOTIFICATION_READ",
  "SYSTEM",
]);
export type SyncTopic = z.infer<typeof syncTopicSchema>;

export const subtaskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"]);
export type SubtaskStatus = z.infer<typeof subtaskStatusSchema>;

export const workerCapacityModeSchema = z.enum(["single", "capped", "unlimited"]);
export type WorkerCapacityMode = z.infer<typeof workerCapacityModeSchema>;

export const unitOfWorkKindSchema = z.enum(["page", "item", "location", "freeform"]);
export type UnitOfWorkKind = z.infer<typeof unitOfWorkKindSchema>;

export const workerRoleSchema = z.enum(["collectionist", "correctionist"]);
export type WorkerRole = z.infer<typeof workerRoleSchema>;

export const reviewDecisionSchema = z.enum(["approve", "redo", "reject"]);
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;

export const reviewerRoleSchema = z.enum(["correctionist", "client", "admin"]);
export type ReviewerRole = z.infer<typeof reviewerRoleSchema>;

export const qualityMetricSchema = z.enum(["edge_coverage", "sharpness", "exposure"]);
export type QualityMetric = z.infer<typeof qualityMetricSchema>;

export const pointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number().finite(), z.number().finite()]),
});
export type Point = z.infer<typeof pointSchema>;

export type User = {
  id: string;
  phone_number: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  last_login_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type JobSubtask = {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  sequence_order: number;
  is_required: boolean;
  status: SubtaskStatus;
  completed_at: Date | string | null;
  metadata: Record<string, unknown>;
  created_at: Date | string;
  updated_at: Date | string;
};

export type DistanceBand = "UNDER_1_KM" | "1_TO_5_KM" | "5_TO_20_KM" | "20KM_PLUS";

export type WorkerJobSummary = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: number;
  budget_cents: number;
  currency: string;
  scheduled_at: Date | string | null;
  created_at: Date | string;
  distance_band: DistanceBand;
};

export type WorkerJobDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: JobStatus;
  priority: number;
  budget_cents: number;
  currency: string;
  scheduled_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  location: Point | null;
  address: string | null;
  is_assigned_to_requester: boolean;
  subtasks: JobSubtask[];
};

export type { JobCapacity, UnitOfWork, MediaRequirement, ReviewConfig } from "./job";
export type { WorkerProfile, JobAssignment } from "./worker";
export type {
  QualityCheckResult,
  OCRResult,
  ReviewEvent,
  Submission,
  SubmissionMedia,
} from "./submission";
export { DEFAULT_QUALITY_THRESHOLDS, type QualityThresholds } from "./quality";
export type { EmailOtpChallenge, EmailOtpRequestInput, EmailOtpVerifyInput } from "./auth";
export type { IdentityFields, UserProfileResponse } from "./profile";

