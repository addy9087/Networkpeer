import {
  updateWorkerVerification,
  type WorkerJobProfile,
  type WorkerVerificationStatus,
} from "../repository.js";

function databaseErrorCode(err: unknown): string | null {
  if (typeof err !== "object" || err === null || !("code" in err)) return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export class AdminWorkerServiceError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "AdminWorkerServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AdminWorkerService {
  async setVerification(
    workerId: string,
    verificationStatus: WorkerVerificationStatus,
    isAvailable: boolean,
  ): Promise<WorkerJobProfile> {
    let profile: WorkerJobProfile | null;
    try {
      profile = await updateWorkerVerification(workerId, verificationStatus, isAvailable);
    } catch (err) {
      if (databaseErrorCode(err) === "55000") {
        throw new AdminWorkerServiceError(
          "WORKER_HAS_ACTIVE_JOB",
          "Worker cannot be made available while assigned work is active",
          409,
        );
      }
      throw err;
    }
    if (!profile) {
      throw new AdminWorkerServiceError("WORKER_NOT_FOUND", "Worker profile not found", 404);
    }
    return profile;
  }
}

export const adminWorkerService = new AdminWorkerService();
