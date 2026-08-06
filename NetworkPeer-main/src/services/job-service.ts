/**
 * Client job workflow service (Phase 3): create, list, view, and cancel jobs.
 * Enforces ownership and state-machine rules above the repository layer.
 */

import {
  cancelJobForClient,
  countJobsByClient,
  getJobById,
  getSubtasksByJob,
  insertJobWithSubtasks,
  listJobsByClient,
} from "../repository.js";
import type { CreateSubtaskInput } from "../repository.js";
import { canClientCancel } from "../state-machine.js";
import type { Job, JobStatus, JobSubtask, Point } from "../contracts.js";

export class JobServiceError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "JobServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export type JobSubtaskInput = {
  title: string;
  description?: string;
  isRequired?: boolean;
};

export type CreateJobParams = {
  clientId: string;
  title: string;
  description: string;
  category: string;
  budgetCents: number;
  currency: string;
  location: Point;
  address?: string;
  scheduledAt?: Date;
  metadata?: Record<string, unknown>;
  publicTitle?: string;
  publicDescription?: string;
  subtasks?: JobSubtaskInput[];
};

export type ListJobsParams = {
  clientId: string;
  statuses?: JobStatus[];
  page: number;
  perPage: number;
};

const MAX_PAGE = 1000;
const MAX_PER_PAGE = 100;

export class JobService {
  /**
   * Create a job owned by the client, optionally with ordered subtasks.
   * The platform fee is intentionally 0 for now (financials land in Phase 8).
   */
  async create(params: CreateJobParams): Promise<Job> {
    return insertJobWithSubtasks(
      {
        clientId: params.clientId,
        title: params.title.trim(),
        description: params.description.trim(),
        category: params.category.trim(),
        budgetCents: params.budgetCents,
        platformFeeCents: 0,
        currency: params.currency,
        location: params.location,
        address: params.address,
        scheduledAt: params.scheduledAt,
        metadata: params.metadata,
        publicTitle: params.publicTitle?.trim(),
        publicDescription: params.publicDescription?.trim(),
      },
      (params.subtasks ?? []).map((subtask, index) =>
        ({
          title: subtask.title.trim(),
          description: subtask.description,
          sequenceOrder: index,
          isRequired: subtask.isRequired,
        }) satisfies CreateSubtaskInput,
      ),
    );
  }

  async list(params: ListJobsParams): Promise<{ items: Job[]; total: number; page: number; perPage: number }> {
    if (!Number.isSafeInteger(params.page) || params.page < 1 || params.page > MAX_PAGE) {
      throw new JobServiceError("INVALID_PAGE", `page must be between 1 and ${MAX_PAGE}`);
    }
    if (!Number.isSafeInteger(params.perPage) || params.perPage < 1 || params.perPage > MAX_PER_PAGE) {
      throw new JobServiceError("INVALID_PAGE_SIZE", `per_page must be between 1 and ${MAX_PER_PAGE}`);
    }
    const statuses = params.statuses ?? [];
    const [items, total] = await Promise.all([
      listJobsByClient(params.clientId, statuses, params.perPage, (params.page - 1) * params.perPage),
      countJobsByClient(params.clientId, statuses),
    ]);
    return { items, total, page: params.page, perPage: params.perPage };
  }

  /**
   * Fetch one job with its subtasks, but only for its owner. A non-owner sees
   * NOT_FOUND (not 403) so job existence is not leaked to other clients.
   */
  async getForClient(clientId: string, jobId: string): Promise<{ job: Job; subtasks: JobSubtask[] }> {
    const job = await getJobById(jobId);
    if (!job || job.client_id !== clientId) {
      throw new JobServiceError("JOB_NOT_FOUND", "Job not found", 404);
    }
    const subtasks = await getSubtasksByJob(jobId);
    return { job, subtasks };
  }

  /**
   * Cancel a client's own POSTED job. Enforced atomically in SQL (ownership +
   * status) and guarded here by the state machine.
   */
  async cancel(clientId: string, jobId: string, reason?: string): Promise<Job> {
    const existing = await getJobById(jobId);
    if (!existing || existing.client_id !== clientId) {
      throw new JobServiceError("JOB_NOT_FOUND", "Job not found", 404);
    }
    if (!canClientCancel(existing.status)) {
      throw new JobServiceError(
        "JOB_NOT_CANCELABLE",
        `Job cannot be cancelled in its current state (${existing.status})`,
        409,
      );
    }
    const cancelled = await cancelJobForClient(jobId, clientId, reason);
    if (!cancelled) {
      // Lost a race (e.g. a worker accepted between our read and the update).
      throw new JobServiceError("JOB_NOT_CANCELABLE", "Job is no longer cancelable", 409);
    }
    return cancelled;
  }
}

export const jobService = new JobService();
