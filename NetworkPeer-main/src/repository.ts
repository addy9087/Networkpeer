import { pool } from "./db.js";
import type { PoolClient } from "pg";
import type {
  JobStatus,
  Job,
  JobSubtask,
  JobSubtaskMedia,
  MediaType,
  Point,
  User,
  UserRole,
  WalletLedgerEntry,
  WorkerJobDetail,
  WorkerJobSummary,
} from "./contracts.js";

/**
 * Data access layer. ALL raw SQL and PostGIS interactions live here.
 * Routes and services must never embed SQL directly.
 */

type Row = Record<string, unknown>;

function mapUser(row: Row): User {
  return {
    id: String(row["id"]),
    phone_number: String(row["phone_number"]),
    email: row["email"] ? String(row["email"]) : null,
    full_name: String(row["full_name"]),
    role: row["role"] as UserRole,
    avatar_url: row["avatar_url"] ? String(row["avatar_url"]) : null,
    is_active: Boolean(row["is_active"]),
    is_verified: Boolean(row["is_verified"]),
    last_login_at: row["last_login_at"] ? new Date(row["last_login_at"] as string) : null,
    created_at: new Date(row["created_at"] as string),
    updated_at: new Date(row["updated_at"] as string),
  };
}

function parsePointValue(raw: unknown): Point | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    // PostGIS returns geometry as "SRID=4326;POINT(lon lat)" in text casts.
    const match = /POINT\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/.exec(raw);
    if (!match) return null;
    return { type: "Point", coordinates: [Number(match[1]), Number(match[2])] };
  }
  return raw as Point;
}

function parsePoint(row: Row): Point | null {
  return parsePointValue(row["location"]);
}

function mapJob(row: Row): Job {
  return {
    id: String(row["id"]),
    client_id: String(row["client_id"]),
    worker_id: row["worker_id"] ? String(row["worker_id"]) : null,
    title: String(row["title"]),
    description: String(row["description"]),
    category: String(row["category"]),
    status: row["status"] as JobStatus,
    priority: Number(row["priority"] ?? 0),
    budget_cents: Number(row["budget_cents"]),
    platform_fee_cents: Number(row["platform_fee_cents"] ?? 0),
    currency: String(row["currency"]),
    location: parsePoint(row) as Point,
    address: row["address"] ? String(row["address"]) : null,
    scheduled_at: row["scheduled_at"] ? new Date(row["scheduled_at"] as string) : null,
    started_at: row["started_at"] ? new Date(row["started_at"] as string) : null,
    completed_at: row["completed_at"] ? new Date(row["completed_at"] as string) : null,
    cancelled_at: row["cancelled_at"] ? new Date(row["cancelled_at"] as string) : null,
    cancellation_reason: row["cancellation_reason"] ? String(row["cancellation_reason"]) : null,
    metadata: (row["metadata"] as Record<string, unknown>) ?? {},
    created_at: new Date(row["created_at"] as string),
    updated_at: new Date(row["updated_at"] as string),
  };
}

function mapSubtask(row: Row): JobSubtask {
  return {
    id: String(row["id"]),
    job_id: String(row["job_id"]),
    title: String(row["title"]),
    description: row["description"] ? String(row["description"]) : null,
    sequence_order: Number(row["sequence_order"]),
    is_required: Boolean(row["is_required"]),
    status: row["status"] as JobSubtask["status"],
    completed_at: row["completed_at"] ? new Date(row["completed_at"] as string) : null,
    metadata: (row["metadata"] as Record<string, unknown>) ?? {},
    created_at: new Date(row["created_at"] as string),
    updated_at: new Date(row["updated_at"] as string),
  };
}

function mapMedia(row: Row): JobSubtaskMedia {
  return {
    id: String(row["id"]),
    subtask_id: String(row["subtask_id"]),
    job_id: String(row["job_id"]),
    worker_id: String(row["worker_id"]),
    s3_key: String(row["s3_key"]),
    s3_bucket: String(row["s3_bucket"]),
    media_type: row["media_type"] as MediaType,
    mime_type: row["mime_type"] ? String(row["mime_type"]) : null,
    file_size_bytes: row["file_size_bytes"] === null || row["file_size_bytes"] === undefined
      ? null
      : Number(row["file_size_bytes"]),
    width: row["width"] === null || row["width"] === undefined ? null : Number(row["width"]),
    height: row["height"] === null || row["height"] === undefined ? null : Number(row["height"]),
    duration_seconds: row["duration_seconds"] === null || row["duration_seconds"] === undefined
      ? null
      : Number(row["duration_seconds"]),
    location: parsePoint(row),
    captured_at: new Date(row["captured_at"] as string),
    uploaded_at: row["uploaded_at"] ? new Date(row["uploaded_at"] as string) : null,
    upload_expires_at: row["upload_expires_at"] ? new Date(row["upload_expires_at"] as string) : null,
    checksum_sha256: row["checksum_sha256"] ? String(row["checksum_sha256"]) : null,
    s3_etag: row["s3_etag"] ? String(row["s3_etag"]) : null,
    s3_version_id: row["s3_version_id"] ? String(row["s3_version_id"]) : null,
    status: row["status"] as JobSubtaskMedia["status"],
    verification_notes: row["verification_notes"] ? String(row["verification_notes"]) : null,
    metadata: (row["metadata"] as Record<string, unknown>) ?? {},
    idempotency_key: row["idempotency_key"] ? String(row["idempotency_key"]) : null,
    created_at: new Date(row["created_at"] as string),
  };
}

type WorkerVisibleJob = Omit<WorkerJobDetail, "subtasks">;

function mapWorkerJobSummary(row: Row): WorkerJobSummary {
  return {
    id: String(row["id"]),
    title: String(row["title"]),
    description: String(row["description"]),
    category: String(row["category"]),
    priority: Number(row["priority"] ?? 0),
    budget_cents: Number(row["budget_cents"]),
    currency: String(row["currency"]),
    scheduled_at: row["scheduled_at"] ? new Date(row["scheduled_at"] as string) : null,
    created_at: new Date(row["created_at"] as string),
    distance_band: row["distance_band"] as WorkerJobSummary["distance_band"],
  };
}

function mapWorkerVisibleJob(row: Row): WorkerVisibleJob {
  return {
    id: String(row["id"]),
    title: String(row["title"]),
    description: String(row["description"]),
    category: String(row["category"]),
    status: row["status"] as JobStatus,
    priority: Number(row["priority"] ?? 0),
    budget_cents: Number(row["budget_cents"]),
    currency: String(row["currency"]),
    scheduled_at: row["scheduled_at"] ? new Date(row["scheduled_at"] as string) : null,
    created_at: new Date(row["created_at"] as string),
    updated_at: new Date(row["updated_at"] as string),
    location: parsePointValue(row["visible_location"]),
    address: row["visible_address"] ? String(row["visible_address"]) : null,
    is_assigned_to_requester: Boolean(row["is_assigned_to_requester"]),
  };
}

function validatePoint({ coordinates: [lon, lat] }: Point): [number, number] {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    throw new RangeError("Point coordinates must be finite numbers");
  }

  if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
    throw new RangeError("Point coordinates are outside WGS84 bounds");
  }

  return [lon, lat];
}

export type CreateJobInput = {
  clientId: string;
  title: string;
  description: string;
  category: string;
  budgetCents: number;
  platformFeeCents: number;
  currency: string;
  location: Point;
  address?: string;
  scheduledAt?: Date;
  metadata?: Record<string, unknown>;
  publicTitle?: string;
  publicDescription?: string;
};

type Queryable = Pick<PoolClient, "query">;

async function insertJobWithQueryable(queryable: Queryable, input: CreateJobInput): Promise<Job> {
  const [lon, lat] = validatePoint(input.location);
  const { rows } = await queryable.query<Row>(
    `
      INSERT INTO jobs (
        client_id, title, description, category, budget_cents,
        platform_fee_cents, currency, location, address, scheduled_at, metadata,
        public_title, public_description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326), $10, $11, $12, $13, $14)
      RETURNING *,
        ST_AsText(location) AS location
    `,
    [
      input.clientId,
      input.title,
      input.description,
      input.category,
      input.budgetCents,
      input.platformFeeCents,
      input.currency,
      lon,
      lat,
      input.address ?? null,
      input.scheduledAt ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.publicTitle ?? "Field work opportunity",
      input.publicDescription ?? "",
    ],
  );
  return mapJob(rows[0] as Row);
}

export async function insertJob(input: CreateJobInput): Promise<Job> {
  return insertJobWithQueryable(pool, input);
}

export async function getJobById(jobId: string): Promise<Job | null> {
  const { rows } = await pool.query<Row>(
    `SELECT *, ST_AsText(location) AS location FROM jobs WHERE id = $1`,
    [jobId],
  );
  return rows[0] ? mapJob(rows[0] as Row) : null;
}

export async function listJobsByClient(
  clientId: string,
  statuses: JobStatus[],
  limit: number,
  offset: number,
): Promise<Job[]> {
  const { rows } = await pool.query<Row>(
    `
      SELECT *, ST_AsText(location) AS location
      FROM jobs
      WHERE client_id = $1 AND ($2::job_status[] IS NULL OR status = ANY($2))
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `,
    [clientId, statuses.length ? statuses : null, limit, offset],
  );
  return rows.map((r) => mapJob(r as Row));
}

export async function countJobsByClient(clientId: string, statuses: JobStatus[]): Promise<number> {
  const { rows } = await pool.query<Row>(
    `
      SELECT COUNT(*)::int AS total
      FROM jobs
      WHERE client_id = $1 AND ($2::job_status[] IS NULL OR status = ANY($2))
    `,
    [clientId, statuses.length ? statuses : null],
  );
  return Number(rows[0]?.["total"] ?? 0);
}

export type NearbyJobsInput = {
  origin: Point;
  radiusMeters: number;
  limit: number;
  offset: number;
};

/**
 * Finds unassigned POSTED jobs within a meter-based radius. Exact distances are
 * deliberately reduced to broad bands before a worker receives assignment.
 */
export async function listNearbyPostedJobs(input: NearbyJobsInput): Promise<WorkerJobSummary[]> {
  const [lon, lat] = validatePoint(input.origin);
  const { rows } = await pool.query<Row>(
    `
      WITH origin AS (
        SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS point
      )
      SELECT
        j.id,
        j.public_title AS title,
        j.public_description AS description,
        j.category,
        j.priority,
        j.budget_cents,
        j.currency,
        j.scheduled_at,
        j.created_at,
        CASE
          WHEN ST_Distance(j.location::geography, origin.point) < 1000 THEN 'UNDER_1_KM'
          WHEN ST_Distance(j.location::geography, origin.point) < 5000 THEN '1_TO_5_KM'
          WHEN ST_Distance(j.location::geography, origin.point) < 20000 THEN '5_TO_20_KM'
          ELSE '20KM_PLUS'
        END AS distance_band
      FROM jobs j
      CROSS JOIN origin
      WHERE j.status = 'POSTED'
        AND j.worker_id IS NULL
        AND ST_DWithin(j.location::geography, origin.point, $3)
      ORDER BY j.location::geography <-> origin.point
      LIMIT $4 OFFSET $5
    `,
    [lon, lat, input.radiusMeters, input.limit, input.offset],
  );
  return rows.map((row) => mapWorkerJobSummary(row as Row));
}

export async function countNearbyPostedJobs(input: Pick<NearbyJobsInput, "origin" | "radiusMeters">): Promise<number> {
  const [lon, lat] = validatePoint(input.origin);
  const { rows } = await pool.query<Row>(
    `
      WITH origin AS (
        SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS point
      )
      SELECT COUNT(*)::int AS total
      FROM jobs j
      CROSS JOIN origin
      WHERE j.status = 'POSTED'
        AND j.worker_id IS NULL
        AND ST_DWithin(j.location::geography, origin.point, $3)
    `,
    [lon, lat, input.radiusMeters],
  );
  return Number(rows[0]?.["total"] ?? 0);
}

/**
 * Returns a job only when it is public (POSTED) or assigned to the requesting
 * worker. The SQL projection deliberately withholds exact location/address for
 * public jobs, so privacy is not dependent on service-layer filtering.
 */
export async function getWorkerVisibleJob(jobId: string, workerId: string): Promise<WorkerVisibleJob | null> {
  const { rows } = await pool.query<Row>(
    `
      SELECT
        j.id,
        CASE WHEN j.worker_id = $2 THEN j.title ELSE j.public_title END AS title,
        CASE WHEN j.worker_id = $2 THEN j.description ELSE j.public_description END AS description,
        j.category,
        j.status,
        j.priority,
        j.budget_cents,
        j.currency,
        j.scheduled_at,
        j.created_at,
        j.updated_at,
        CASE WHEN j.worker_id = $2 THEN ST_AsText(j.location) END AS visible_location,
        CASE WHEN j.worker_id = $2 THEN j.address END AS visible_address,
        (j.worker_id = $2) AS is_assigned_to_requester
      FROM jobs j
      WHERE j.id = $1
        AND (
          (j.status = 'POSTED' AND j.worker_id IS NULL)
          OR j.worker_id = $2
        )
    `,
    [jobId, workerId],
  );
  return rows[0] ? mapWorkerVisibleJob(rows[0] as Row) : null;
}

export type CreateSubtaskInput = {
  title: string;
  description?: string;
  sequenceOrder: number;
  isRequired?: boolean;
  metadata?: Record<string, unknown>;
};

async function insertSubtaskWithQueryable(
  queryable: Queryable,
  jobId: string,
  input: CreateSubtaskInput,
): Promise<JobSubtask> {
  const { rows } = await queryable.query<Row>(
    `
      INSERT INTO job_subtasks (job_id, title, description, sequence_order, is_required, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      jobId,
      input.title,
      input.description ?? null,
      input.sequenceOrder,
      input.isRequired ?? true,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return mapSubtask(rows[0] as Row);
}

export async function insertSubtask(jobId: string, input: CreateSubtaskInput): Promise<JobSubtask> {
  return insertSubtaskWithQueryable(pool, jobId, input);
}

/** Create a job and all of its subtasks as one atomic database transaction. */
export async function insertJobWithSubtasks(
  input: CreateJobInput,
  subtasks: readonly CreateSubtaskInput[],
): Promise<Job> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const job = await insertJobWithQueryable(client, input);
    for (const subtask of subtasks) {
      await insertSubtaskWithQueryable(client, job.id, subtask);
    }
    await client.query("COMMIT");
    return job;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Client-initiated cancellation. Atomically transitions the job to CANCELLED
 * only if it is still owned by the client and still POSTED. Returns null if
 * the job is not found, not owned, or no longer cancelable — the caller maps
 * null to the appropriate HTTP error.
 */
export async function cancelJobForClient(
  jobId: string,
  clientId: string,
  reason?: string,
): Promise<Job | null> {
  const { rows } = await pool.query<Row>(
    `
      UPDATE jobs
      SET status = 'CANCELLED', cancelled_at = NOW(), cancellation_reason = $3, updated_at = NOW()
      WHERE id = $1 AND client_id = $2 AND status = 'POSTED'
      RETURNING *, ST_AsText(location) AS location
    `,
    [jobId, clientId, reason ?? null],
  );
  return rows[0] ? mapJob(rows[0] as Row) : null;
}

/**
 * Atomically accept a job for a worker.
 * Delegates to the `accept_job` database function which uses FOR UPDATE
 * row locking; PostgreSQL raises `55000` if the job is not POSTED and
 * `22000` for invalid worker or job.
 */
export async function acceptJobForWorker(
  jobId: string,
  workerId: string,
): Promise<{ jobId: string; workerId: string; status: JobStatus }> {
  const { rows } = await pool.query<Row>(
    `SELECT * FROM accept_job($1, $2)`,
    [jobId, workerId],
  );
  const row = rows[0] as Row;
  return {
    jobId: String(row["job_id"]),
    workerId: String(row["worker_id"]),
    status: row["status"] as JobStatus,
  };
}

export async function getSubtasksByJob(jobId: string): Promise<JobSubtask[]> {
  const { rows } = await pool.query<Row>(
    `SELECT * FROM job_subtasks WHERE job_id = $1 ORDER BY sequence_order ASC`,
    [jobId],
  );
  return rows.map((r) => mapSubtask(r as Row));
}

export type ReserveMediaUploadInput = {
  mediaId: string;
  workerId: string;
  jobId: string;
  subtaskId: string;
  s3Key: string;
  s3Bucket: string;
  mediaType: MediaType;
  mimeType: string;
  fileSizeBytes: number;
  capturedAt: Date;
  location?: Point;
  checksumSha256: string;
  idempotencyKey: string;
  uploadExpiresAt: Date;
};

export type MediaReservation = {
  media: JobSubtaskMedia;
  uploadAllowed: boolean;
};

export class MediaReservationConflictError extends Error {
  constructor() {
    super("An idempotency key cannot be reused for different evidence");
    this.name = "MediaReservationConflictError";
  }
}

function pointsMatch(left: Point | null, right: Point | undefined): boolean {
  if (!left || !right) return left === null && right === undefined;
  return left.coordinates[0] === right.coordinates[0] && left.coordinates[1] === right.coordinates[1];
}

function reservationMatches(media: JobSubtaskMedia, input: ReserveMediaUploadInput): boolean {
  return (
    media.job_id === input.jobId &&
    media.subtask_id === input.subtaskId &&
    media.media_type === input.mediaType &&
    media.mime_type === input.mimeType &&
    media.file_size_bytes === input.fileSizeBytes &&
    media.captured_at.getTime() === input.capturedAt.getTime() &&
    media.checksum_sha256 === input.checksumSha256 &&
    pointsMatch(media.location, input.location)
  );
}

async function getReservationByIdempotencyKey(
  queryable: Queryable,
  workerId: string,
  idempotencyKey: string,
): Promise<{ media: JobSubtaskMedia; jobStatus: JobStatus } | null> {
  const { rows } = await queryable.query<Row>(
    `
      SELECT m.*, j.status AS job_status, ST_AsText(m.location) AS location
      FROM job_subtask_media m
      JOIN jobs j ON j.id = m.job_id
      JOIN job_subtasks s ON s.id = m.subtask_id AND s.job_id = m.job_id
      WHERE m.worker_id = $1
        AND m.idempotency_key = $2
        AND j.worker_id = $1
      FOR UPDATE OF m, j, s
    `,
    [workerId, idempotencyKey],
  );
  if (!rows[0]) return null;
  return { media: mapMedia(rows[0] as Row), jobStatus: rows[0]["job_status"] as JobStatus };
}

/**
 * Creates a server-owned evidence reservation after locking the in-progress job
 * and its subtask. Retried idempotency keys return the same reservation.
 */
export async function reserveMediaUpload(input: ReserveMediaUploadInput): Promise<MediaReservation | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const verifiedWorker = await client.query<{ verification_status: string }>(
      `
        SELECT verification_status
        FROM worker_profiles
        WHERE user_id = $1
        FOR UPDATE
      `,
      [input.workerId],
    );
    if (verifiedWorker.rows[0]?.verification_status !== "VERIFIED") {
      await client.query("COMMIT");
      return null;
    }
    let existing = await getReservationByIdempotencyKey(client, input.workerId, input.idempotencyKey);
    if (existing) {
      if (!reservationMatches(existing.media, input)) throw new MediaReservationConflictError();
      if (existing.media.status !== "PENDING") {
        await client.query("COMMIT");
        return { media: existing.media, uploadAllowed: false };
      }
      if (existing.jobStatus !== "IN_PROGRESS") {
        await client.query("COMMIT");
        return null;
      }
      const refreshed = await client.query<Row>(
        `
          UPDATE job_subtask_media
          SET upload_expires_at = $2
          WHERE id = $1
          RETURNING *, ST_AsText(location) AS location
        `,
        [existing.media.id, input.uploadExpiresAt],
      );
      await client.query("COMMIT");
      return { media: mapMedia(refreshed.rows[0] as Row), uploadAllowed: true };
    }

    const eligibility = await client.query(
      `
        SELECT 1
        FROM jobs j
        JOIN job_subtasks s ON s.id = $2 AND s.job_id = j.id
        WHERE j.id = $1
          AND j.worker_id = $3
          AND j.status = 'IN_PROGRESS'
          AND s.status <> 'SKIPPED'
        FOR UPDATE OF j, s
      `,
      [input.jobId, input.subtaskId, input.workerId],
    );
    if (!eligibility.rows[0]) {
      await client.query("COMMIT");
      return null;
    }

    const lon = input.location?.coordinates[0] ?? null;
    const lat = input.location?.coordinates[1] ?? null;
    const inserted = await client.query<Row>(
      `
        INSERT INTO job_subtask_media (
          id, subtask_id, job_id, worker_id, s3_key, s3_bucket, media_type,
          mime_type, file_size_bytes, location, captured_at, upload_expires_at,
          checksum_sha256, idempotency_key
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          CASE WHEN $10::double precision IS NULL THEN NULL
            ELSE ST_SetSRID(ST_MakePoint($10, $11), 4326) END,
          $12, $13, $14, $15
        )
        ON CONFLICT (worker_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
        RETURNING *, ST_AsText(location) AS location
      `,
      [
        input.mediaId,
        input.subtaskId,
        input.jobId,
        input.workerId,
        input.s3Key,
        input.s3Bucket,
        input.mediaType,
        input.mimeType,
        input.fileSizeBytes,
        lon,
        lat,
        input.capturedAt,
        input.uploadExpiresAt,
        input.checksumSha256,
        input.idempotencyKey,
      ],
    );
    if (inserted.rows[0]) {
      await client.query("COMMIT");
      return { media: mapMedia(inserted.rows[0] as Row), uploadAllowed: true };
    }

    existing = await getReservationByIdempotencyKey(client, input.workerId, input.idempotencyKey);
    if (!existing || !reservationMatches(existing.media, input)) {
      throw new MediaReservationConflictError();
    }
    await client.query("COMMIT");
    return { media: existing.media, uploadAllowed: existing.media.status === "PENDING" && existing.jobStatus === "IN_PROGRESS" };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getMediaForWorker(mediaId: string, workerId: string): Promise<JobSubtaskMedia | null> {
  const { rows } = await pool.query<Row>(
    `
      SELECT m.*, ST_AsText(m.location) AS location
      FROM job_subtask_media m
      JOIN jobs j ON j.id = m.job_id
      WHERE m.id = $1
        AND m.worker_id = $2
        AND j.worker_id = $2
    `,
    [mediaId, workerId],
  );
  return rows[0] ? mapMedia(rows[0] as Row) : null;
}

export async function confirmMediaUpload(input: {
  mediaId: string;
  workerId: string;
  fileSizeBytes: number;
  mimeType: string;
  checksumSha256: string;
  s3Etag: string;
  s3VersionId: string | null;
}): Promise<JobSubtaskMedia | null> {
  await pool.query(
    `SELECT * FROM confirm_job_subtask_media_upload($1, $2, $3, $4::varchar, $5::varchar, $6, $7)`,
    [
      input.mediaId,
      input.workerId,
      input.fileSizeBytes,
      input.mimeType,
      input.checksumSha256,
      input.s3Etag,
      input.s3VersionId,
    ],
  );
  return getMediaForWorker(input.mediaId, input.workerId);
}

export async function submitJobWithEvidence(
  jobId: string,
  workerId: string,
): Promise<{ jobId: string; status: JobStatus } | null> {
  const { rows } = await pool.query<Row>(
    `SELECT * FROM submit_job_with_evidence($1, $2)`,
    [jobId, workerId],
  );
  const row = rows[0];
  if (!row) return null;
  return { jobId: String(row["job_id"]), status: row["status"] as JobStatus };
}

export async function advanceWorkerJobStatus(
  jobId: string,
  workerId: string,
  targetStatus: Extract<JobStatus, "EN_ROUTE" | "AT_LOCATION" | "IN_PROGRESS">,
): Promise<{ jobId: string; status: JobStatus } | null> {
  const { rows } = await pool.query<Row>(
    `SELECT * FROM advance_worker_job_status($1, $2, $3::job_status)`,
    [jobId, workerId, targetStatus],
  );
  const row = rows[0];
  if (!row) return null;
  return { jobId: String(row["job_id"]), status: row["status"] as JobStatus };
}

export async function getLedgerByUser(userId: string, limit = 100): Promise<WalletLedgerEntry[]> {
  const { rows } = await pool.query<Row>(
    `
      SELECT * FROM wallet_ledger
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [userId, limit],
  );
  return rows.map((r) => ({
    id: String(r["id"]),
    user_id: String(r["user_id"]),
    job_id: r["job_id"] ? String(r["job_id"]) : null,
    transaction_type: r["transaction_type"] as WalletLedgerEntry["transaction_type"],
    transaction_status: r["transaction_status"] as WalletLedgerEntry["transaction_status"],
    amount_cents: Number(r["amount_cents"]),
    balance_after_cents: Number(r["balance_after_cents"]),
    currency: String(r["currency"]),
    reference_id: r["reference_id"] ? String(r["reference_id"]) : null,
    reference_type: r["reference_type"] ? String(r["reference_type"]) : null,
    description: String(r["description"]),
    metadata: (r["metadata"] as Record<string, unknown>) ?? {},
    idempotency_key: r["idempotency_key"] ? String(r["idempotency_key"]) : null,
    processed_at: r["processed_at"] ? new Date(r["processed_at"] as string) : null,
    created_at: new Date(r["created_at"] as string),
  }));
}

export async function healthCheck(): Promise<{
  database: boolean;
  postgis: boolean;
}> {
  const { rows } = await pool.query<Row>(
    `SELECT current_database() AS db, postgis_version() AS postgis_version`,
  );
  const row = rows[0] as Row;
  return {
    database: Boolean(row["db"]),
    postgis: Boolean(row["postgis_version"]),
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getUserByPhone(phone: string): Promise<User | null> {
  const { rows } = await pool.query<Row>(`SELECT * FROM users WHERE phone_number = $1`, [phone]);
  return rows[0] ? mapUser(rows[0] as Row) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const { rows } = await pool.query<Row>(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] ? mapUser(rows[0] as Row) : null;
}

export type WorkerJobProfile = {
  verificationStatus: string;
  preferredRadiusKm: number;
  isAvailable: boolean;
};

export type WorkerVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";

export async function updateWorkerVerification(
  workerId: string,
  verificationStatus: WorkerVerificationStatus,
  isAvailable: boolean,
): Promise<WorkerJobProfile | null> {
  const { rows } = await pool.query<Row>(
    `
      SELECT verification_status, preferred_radius_km, is_available
      FROM set_worker_verification($1, $2::varchar, $3)
    `,
    [workerId, verificationStatus, isAvailable],
  );
  if (!rows[0]) return null;
  return {
    verificationStatus: String(rows[0]["verification_status"]),
    preferredRadiusKm: Number(rows[0]["preferred_radius_km"]),
    isAvailable: Boolean(rows[0]["is_available"]),
  };
}

export async function getWorkerJobProfile(workerId: string): Promise<WorkerJobProfile | null> {
  const { rows } = await pool.query<Row>(
    `
      SELECT verification_status, preferred_radius_km, is_available
      FROM worker_profiles
      WHERE user_id = $1
    `,
    [workerId],
  );
  if (!rows[0]) return null;
  return {
    verificationStatus: String(rows[0]["verification_status"]),
    preferredRadiusKm: Number(rows[0]["preferred_radius_km"]),
    isAvailable: Boolean(rows[0]["is_available"]),
  };
}

export async function createUser(input: {
  phone: string;
  role: UserRole;
  fullName?: string;
}): Promise<User> {
  const { rows } = await pool.query<Row>(
    `INSERT INTO users (phone_number, full_name, role, is_verified)
     VALUES ($1, $2, $3, TRUE)
     RETURNING *`,
    [input.phone, input.fullName ?? "Unnamed user", input.role],
  );
  return mapUser(rows[0] as Row);
}

export async function ensureWorkerProfile(userId: string): Promise<void> {
  await pool.query(
    `INSERT INTO worker_profiles (user_id, is_available)
     VALUES ($1, FALSE)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
}

export async function markUserVerified(userId: string): Promise<void> {
  await pool.query(`UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1`, [userId]);
}

export async function recordLastLogin(userId: string): Promise<void> {
  await pool.query(`UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, [userId]);
}
