import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../../../database/database.service";
import type { ProcessingJobsRepositoryPort } from "../../../application/ports/processing-jobs-repository.port";
import type {
  ProcessingJobCreateCommand,
  ProcessingJobError,
  ProcessingJobExecutionResult,
  ProcessingJobRecord,
  ProcessingJobStatus
} from "../../../domain/processing-job.types";

type ProcessingJobRow = {
  job_id: string;
  status: ProcessingJobStatus;
  created_at: Date | string;
  updated_at: Date | string;
  started_at: Date | string | null;
  finished_at: Date | string | null;
  triggered_by: string;
  task: ProcessingJobCreateCommand["task"];
  target_id: string;
  options_json: unknown;
  idempotency_key: string | null;
  trace_id: string | null;
  attempt_count: number;
  max_attempts: number;
  publish_count: number;
  last_published_at: Date | string | null;
  next_retry_at: Date | string | null;
  cancel_requested: number;
  cancelled_at: Date | string | null;
  cancelled_by: string | null;
  cancelled_reason: string | null;
  result_json: unknown | null;
  error_json: unknown | null;
};

@Injectable()
export class MySqlProcessingJobsRepository implements ProcessingJobsRepositoryPort {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(job: ProcessingJobRecord): Promise<void> {
    await this.databaseService.query(
      `
      INSERT INTO processing_jobs (
        job_id, status, created_at, updated_at, started_at, finished_at, triggered_by,
        task, target_id, options_json, idempotency_key, trace_id, attempt_count, max_attempts,
        publish_count, last_published_at, next_retry_at, cancel_requested, cancelled_at,
        cancelled_by, cancelled_reason, result_json, error_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        job.jobId,
        job.status,
        toSqlDate(job.createdAt),
        toSqlDate(job.updatedAt),
        toSqlDateNullable(job.startedAt),
        toSqlDateNullable(job.finishedAt),
        job.triggeredBy,
        job.command.task,
        job.command.targetId,
        JSON.stringify(job.command.options),
        job.idempotencyKey ?? null,
        job.traceId ?? null,
        job.attemptCount,
        job.maxAttempts,
        job.publishCount,
        toSqlDateNullable(job.lastPublishedAt),
        toSqlDateNullable(job.nextRetryAt),
        job.cancelRequested ? 1 : 0,
        toSqlDateNullable(job.cancelledAt),
        job.cancelledBy ?? null,
        job.cancelledReason ?? null,
        job.result ? JSON.stringify(job.result) : null,
        job.error ? JSON.stringify(job.error) : null
      ]
    );
  }

  async update(job: ProcessingJobRecord): Promise<void> {
    await this.databaseService.query(
      `
      UPDATE processing_jobs
      SET
        status = ?,
        updated_at = ?,
        started_at = ?,
        finished_at = ?,
        triggered_by = ?,
        task = ?,
        target_id = ?,
        options_json = ?,
        idempotency_key = ?,
        trace_id = ?,
        attempt_count = ?,
        max_attempts = ?,
        publish_count = ?,
        last_published_at = ?,
        next_retry_at = ?,
        cancel_requested = ?,
        cancelled_at = ?,
        cancelled_by = ?,
        cancelled_reason = ?,
        result_json = ?,
        error_json = ?
      WHERE job_id = ?
      `,
      [
        job.status,
        toSqlDate(job.updatedAt),
        toSqlDateNullable(job.startedAt),
        toSqlDateNullable(job.finishedAt),
        job.triggeredBy,
        job.command.task,
        job.command.targetId,
        JSON.stringify(job.command.options),
        job.idempotencyKey ?? null,
        job.traceId ?? null,
        job.attemptCount,
        job.maxAttempts,
        job.publishCount,
        toSqlDateNullable(job.lastPublishedAt),
        toSqlDateNullable(job.nextRetryAt),
        job.cancelRequested ? 1 : 0,
        toSqlDateNullable(job.cancelledAt),
        job.cancelledBy ?? null,
        job.cancelledReason ?? null,
        job.result ? JSON.stringify(job.result) : null,
        job.error ? JSON.stringify(job.error) : null,
        job.jobId
      ]
    );
  }

  async findById(jobId: string): Promise<ProcessingJobRecord | null> {
    const rows = await this.databaseService.query<ProcessingJobRow[]>(
      `
      SELECT *
      FROM processing_jobs
      WHERE job_id = ?
      LIMIT 1
      `,
      [jobId]
    );
    return rows[0] ? mapRowToRecord(rows[0]) : null;
  }

  async findByIds(jobIds: string[]): Promise<ProcessingJobRecord[]> {
    const dedupedJobIds = dedupeJobIds(jobIds);
    if (dedupedJobIds.length === 0) {
      return [];
    }

    const placeholders = dedupedJobIds.map(() => "?").join(", ");
    const rows = await this.databaseService.query<ProcessingJobRow[]>(
      `
      SELECT *
      FROM processing_jobs
      WHERE job_id IN (${placeholders})
      `,
      dedupedJobIds
    );

    const recordsById = new Map<string, ProcessingJobRecord>();
    for (const row of rows) {
      recordsById.set(row.job_id, mapRowToRecord(row));
    }

    const orderedRecords: ProcessingJobRecord[] = [];
    for (const jobId of dedupedJobIds) {
      const record = recordsById.get(jobId);
      if (record) {
        orderedRecords.push(record);
      }
    }

    return orderedRecords;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<ProcessingJobRecord | null> {
    const rows = await this.databaseService.query<ProcessingJobRow[]>(
      `
      SELECT *
      FROM processing_jobs
      WHERE idempotency_key = ?
      LIMIT 1
      `,
      [idempotencyKey]
    );
    return rows[0] ? mapRowToRecord(rows[0]) : null;
  }

  async listRecent(limit: number): Promise<ProcessingJobRecord[]> {
    const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
    const rows = await this.databaseService.query<ProcessingJobRow[]>(
      `
      SELECT *
      FROM processing_jobs
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [normalizedLimit]
    );
    return rows.map((row) => mapRowToRecord(row));
  }

  async listRecoverable(limit: number): Promise<ProcessingJobRecord[]> {
    const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
    const rows = await this.databaseService.query<ProcessingJobRow[]>(
      `
      SELECT *
      FROM processing_jobs
      WHERE
        status IN ('queued', 'running')
        AND cancel_requested = 0
        AND (next_retry_at IS NULL OR next_retry_at <= UTC_TIMESTAMP(3))
      ORDER BY created_at ASC
      LIMIT ?
      `,
      [normalizedLimit]
    );
    return rows.map((row) => mapRowToRecord(row));
  }
}

function mapRowToRecord(row: ProcessingJobRow): ProcessingJobRecord {
  return {
    jobId: row.job_id,
    status: row.status,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    startedAt: toIsoStringNullable(row.started_at),
    finishedAt: toIsoStringNullable(row.finished_at),
    triggeredBy: row.triggered_by,
    command: {
      task: row.task,
      targetId: row.target_id,
      options: parseJsonField<ProcessingJobCreateCommand["options"]>(row.options_json, {
        bypassCache: true,
        includeBenchmarkMetadata: true
      })
    },
    idempotencyKey: row.idempotency_key ?? undefined,
    traceId: row.trace_id ?? undefined,
    attemptCount: Number(row.attempt_count),
    maxAttempts: Number(row.max_attempts),
    publishCount: Number(row.publish_count),
    lastPublishedAt: toIsoStringNullable(row.last_published_at),
    nextRetryAt: toIsoStringNullable(row.next_retry_at),
    cancelRequested: Number(row.cancel_requested) > 0,
    cancelledAt: toIsoStringNullable(row.cancelled_at),
    cancelledBy: row.cancelled_by ?? undefined,
    cancelledReason: row.cancelled_reason ?? undefined,
    result: row.result_json
      ? parseJsonField<ProcessingJobExecutionResult>(row.result_json, undefined)
      : undefined,
    error: row.error_json
      ? parseJsonField<ProcessingJobError>(row.error_json, undefined)
      : undefined
  };
}

function parseJsonField<T>(input: unknown, fallback: T): T;
function parseJsonField<T>(input: unknown, fallback: T | undefined): T | undefined;
function parseJsonField<T>(input: unknown, fallback: T | undefined): T | undefined {
  if (typeof input === "string") {
    try {
      return JSON.parse(input) as T;
    } catch {
      return fallback;
    }
  }

  if (typeof input === "object" && input !== null) {
    return input as T;
  }

  return fallback;
}

function toSqlDate(value: string): string {
  return new Date(value).toISOString().slice(0, 23).replace("T", " ");
}

function toSqlDateNullable(value?: string): string | null {
  return value ? toSqlDate(value) : null;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toIsoStringNullable(value: Date | string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  return toIsoString(value);
}

function dedupeJobIds(jobIds: readonly string[]): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const jobId of jobIds) {
    if (seen.has(jobId)) {
      continue;
    }
    seen.add(jobId);
    deduped.push(jobId);
  }
  return deduped;
}
