import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AppConfigService } from "../../../common/config/app-config.service";
import { AppException } from "../../../common/http/app-exception";
import { AreasApplicationService } from "../../areas/application/areas.application.service";
import { CatalogApplicationService } from "../../catalog/application/catalog.application.service";
import { VfxApplicationService } from "../../vfx/application/vfx.application.service";
import {
  PROCESSING_JOBS_PUBLISHER,
  type ProcessingJobsPublisherPort
} from "./ports/processing-jobs-publisher.port";
import {
  PROCESSING_JOBS_REPOSITORY,
  type ProcessingJobsRepositoryPort
} from "./ports/processing-jobs-repository.port";
import type {
  ProcessingJobCreateCommand,
  ProcessingJobError,
  ProcessingJobExecutionResult,
  ProcessingJobRecord,
  ProcessingQueueMetrics,
  ProcessingJobSummary
} from "../domain/processing-job.types";

@Injectable()
export class ProcessingJobsApplicationService implements OnModuleInit {
  private readonly logger = new Logger(ProcessingJobsApplicationService.name);
  private readonly queue: string[] = [];
  private readonly queued = new Set<string>();
  private processing = false;

  constructor(
    private readonly catalogService: CatalogApplicationService,
    private readonly areasService: AreasApplicationService,
    private readonly vfxService: VfxApplicationService,
    private readonly config: AppConfigService,
    @Inject(PROCESSING_JOBS_REPOSITORY)
    private readonly repository: ProcessingJobsRepositoryPort,
    @Inject(PROCESSING_JOBS_PUBLISHER)
    private readonly publisher: ProcessingJobsPublisherPort
  ) {}

  async onModuleInit(): Promise<void> {
    const recoverable = await this.repository.listRecoverable(1000);
    for (const job of recoverable) {
      this.enqueueLocal(job.jobId);
    }
    this.scheduleDrain();
  }

  async enqueueJob(
    command: ProcessingJobCreateCommand,
    triggeredBy: string
  ): Promise<ProcessingJobSummary> {
    if (command.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(command.idempotencyKey);
      if (existing) {
        return toSummary(existing);
      }
    }

    const now = new Date().toISOString();
    const job: ProcessingJobRecord = {
      jobId: randomUUID(),
      status: "queued",
      createdAt: now,
      updatedAt: now,
      triggeredBy,
      command: structuredClone(command),
      idempotencyKey: command.idempotencyKey,
      traceId: command.traceId,
      attemptCount: 0,
      maxAttempts: this.config.processingJobsMaxAttempts,
      publishCount: 0,
      cancelRequested: false
    };

    try {
      await this.repository.create(job);
    } catch (error) {
      if (command.idempotencyKey && isDuplicateEntryError(error)) {
        const existing = await this.repository.findByIdempotencyKey(command.idempotencyKey);
        if (existing) {
          return toSummary(existing);
        }
      }
      throw error;
    }

    await this.publishQueued(job);
    this.enqueueLocal(job.jobId);
    this.scheduleDrain();

    return toSummary(job);
  }

  async getJob(jobId: string): Promise<ProcessingJobSummary> {
    const job = await this.repository.findById(jobId);
    if (!job) {
      throw new AppException({
        status: 404,
        code: "PROCESSING_JOB_NOT_FOUND",
        message: "Processing job was not found."
      });
    }

    return toSummary(job);
  }

  async getJobResult(jobId: string): Promise<ProcessingJobExecutionResult> {
    const job = await this.repository.findById(jobId);
    if (!job) {
      throw new AppException({
        status: 404,
        code: "PROCESSING_JOB_NOT_FOUND",
        message: "Processing job was not found."
      });
    }

    if (job.status === "queued" || job.status === "running") {
      throw new AppException({
        status: 409,
        code: "PROCESSING_JOB_NOT_READY",
        message: "Processing job result is not ready yet.",
        retryable: true
      });
    }

    if (job.status === "cancelled") {
      throw new AppException({
        status: 409,
        code: "PROCESSING_JOB_CANCELLED",
        message: job.cancelledReason ?? "Processing job was cancelled.",
        retryable: false
      });
    }

    if (job.status === "failed") {
      throw new AppException({
        status: 409,
        code: "PROCESSING_JOB_FAILED",
        message: job.error?.message ?? "Processing job failed.",
        retryable: false
      });
    }

    if (!job.result) {
      throw new AppException({
        status: 409,
        code: "PROCESSING_JOB_NOT_READY",
        message: "Processing job result is not ready yet.",
        retryable: true
      });
    }

    return structuredClone(job.result);
  }

  async listJobs(limit = 20): Promise<ProcessingJobSummary[]> {
    const jobs = await this.repository.listRecent(limit);
    return jobs.map((job) => toSummary(job));
  }

  async getJobsStatus(
    jobIds: string[]
  ): Promise<{ jobs: ProcessingJobSummary[]; missingJobIds: string[] }> {
    const dedupedJobIds = dedupeJobIds(jobIds);
    if (dedupedJobIds.length === 0) {
      return {
        jobs: [],
        missingJobIds: []
      };
    }

    const jobs = await this.repository.findByIds(dedupedJobIds);
    const jobsById = new Map(jobs.map((job) => [job.jobId, job]));

    const summaries: ProcessingJobSummary[] = [];
    const missingJobIds: string[] = [];

    for (const jobId of dedupedJobIds) {
      const job = jobsById.get(jobId);
      if (!job) {
        missingJobIds.push(jobId);
        continue;
      }
      summaries.push(toSummary(job));
    }

    return {
      jobs: summaries,
      missingJobIds
    };
  }

  async getQueueMetrics(windowSize = 1000): Promise<ProcessingQueueMetrics> {
    const normalizedWindowSize = Math.min(Math.max(Math.trunc(windowSize), 1), 10_000);
    const jobs = await this.repository.listRecent(normalizedWindowSize);

    const counts = {
      pending: 0,
      running: 0,
      failed: 0,
      deadLetter: 0
    };
    const durationsMs: number[] = [];

    for (const job of jobs) {
      if (job.status === "queued") {
        counts.pending += 1;
      } else if (job.status === "running") {
        counts.running += 1;
      } else if (job.status === "failed") {
        counts.failed += 1;
        if (job.attemptCount >= job.maxAttempts) {
          counts.deadLetter += 1;
        }
      }

      const durationMs = computeJobDurationMs(job);
      if (durationMs !== null) {
        durationsMs.push(durationMs);
      }
    }

    return {
      windowSize: normalizedWindowSize,
      sampledJobs: jobs.length,
      counts,
      durationMs: {
        p50: calculatePercentileNearestRank(durationsMs, 0.5),
        p95: calculatePercentileNearestRank(durationsMs, 0.95)
      },
      generatedAt: new Date().toISOString()
    };
  }

  async cancelJob(
    jobId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<ProcessingJobSummary> {
    const job = await this.requireJob(jobId);
    if (job.status === "completed" || job.status === "failed") {
      throw new AppException({
        status: 409,
        code: "PROCESSING_JOB_NOT_CANCELLABLE",
        message: "Only queued or running jobs can be cancelled."
      });
    }

    const now = new Date().toISOString();
    job.cancelRequested = true;
    job.cancelledBy = cancelledBy;
    job.cancelledReason = reason ?? "Cancelled by user request.";
    job.updatedAt = now;

    if (job.status === "queued") {
      job.status = "cancelled";
      job.cancelledAt = now;
      job.finishedAt = now;
      this.queued.delete(job.jobId);
    }

    await this.repository.update(job);
    return toSummary(job);
  }

  async retryJob(jobId: string, triggeredBy: string): Promise<ProcessingJobSummary> {
    const job = await this.requireJob(jobId);
    if (job.status !== "failed" && job.status !== "cancelled") {
      throw new AppException({
        status: 409,
        code: "PROCESSING_JOB_NOT_RETRYABLE",
        message: "Only failed or cancelled jobs can be retried."
      });
    }

    const now = new Date().toISOString();
    job.status = "queued";
    job.updatedAt = now;
    job.startedAt = undefined;
    job.finishedAt = undefined;
    job.cancelRequested = false;
    job.cancelledAt = undefined;
    job.cancelledBy = undefined;
    job.cancelledReason = undefined;
    job.error = undefined;
    job.result = undefined;
    job.nextRetryAt = undefined;
    job.triggeredBy = triggeredBy;
    if (job.attemptCount >= job.maxAttempts) {
      job.maxAttempts = job.attemptCount + 1;
    }

    await this.repository.update(job);
    await this.publishQueued(job);
    this.enqueueLocal(job.jobId);
    this.scheduleDrain();
    return toSummary(job);
  }

  private scheduleDrain(): void {
    if (!this.config.processingJobsInlineEnabled) {
      return;
    }
    if (this.processing) {
      return;
    }
    void this.drainQueue();
  }

  private async drainQueue(): Promise<void> {
    if (!this.config.processingJobsInlineEnabled) {
      return;
    }
    if (this.processing) {
      return;
    }
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const jobId = this.queue.shift();
        if (!jobId) {
          break;
        }
        this.queued.delete(jobId);

        const job = await this.repository.findById(jobId);
        if (!job || job.status !== "queued") {
          continue;
        }
        if (job.cancelRequested) {
          await this.markCancelled(job, job.cancelledReason ?? "Cancelled before execution.");
          continue;
        }
        if (job.nextRetryAt && new Date(job.nextRetryAt).getTime() > Date.now()) {
          this.enqueueLocal(job.jobId);
          continue;
        }

        await this.executeSingle(job);
      }
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        this.scheduleDrain();
      }
    }
  }

  private async executeSingle(job: ProcessingJobRecord): Promise<void> {
    const now = new Date().toISOString();
    job.status = "running";
    job.startedAt = now;
    job.updatedAt = now;
    job.attemptCount += 1;
    await this.repository.update(job);

    try {
      job.result = await this.executeJob(job.command);
      job.error = undefined;
      job.status = "completed";
      job.finishedAt = new Date().toISOString();
      job.updatedAt = job.finishedAt;
      await this.repository.update(job);
    } catch (error) {
      job.error = extractError(error);
      job.updatedAt = new Date().toISOString();

      if (job.attemptCount >= job.maxAttempts) {
        job.status = "failed";
        job.finishedAt = job.updatedAt;
        await this.repository.update(job);
        await this.publishDeadLetter(job);
        return;
      }

      job.status = "queued";
      job.nextRetryAt = computeNextRetryAt(
        job.attemptCount,
        this.config.processingJobsRetryBaseDelayMs,
        this.config.processingJobsRetryMaxDelayMs
      );
      await this.repository.update(job);
      await this.publishQueued(job);
      this.enqueueLocal(job.jobId);
    }
  }

  private async executeJob(
    command: ProcessingJobCreateCommand
  ): Promise<ProcessingJobExecutionResult> {
    if (command.task === "process_placeable") {
      const response = await this.catalogService.processPlaceable({
        templateId: command.targetId,
        subtypeHint: command.options.subtypeHint,
        bypassCache: command.options.bypassCache,
        includeBenchmarkMetadata: command.options.includeBenchmarkMetadata
      });
      return {
        entityType: "placeable",
        entityId: command.targetId,
        cache: response.cache,
        payload: response
      };
    }

    if (command.task === "process_creature") {
      const response = await this.catalogService.processCreature({
        templateId: command.targetId,
        bypassCache: command.options.bypassCache,
        includeBenchmarkMetadata: command.options.includeBenchmarkMetadata
      });
      return {
        entityType: "creature",
        entityId: command.targetId,
        cache: response.cache,
        payload: response
      };
    }

    if (command.task === "process_item") {
      const response = await this.catalogService.processItem({
        templateId: command.targetId,
        bypassCache: command.options.bypassCache,
        includeBenchmarkMetadata: command.options.includeBenchmarkMetadata
      });
      return {
        entityType: "item",
        entityId: command.targetId,
        cache: response.cache,
        payload: response
      };
    }

    if (command.task === "process_vfx_runtime_package") {
      const response = await this.vfxService.processVfxRuntimePackageFromJob(
        command.targetId,
        command.options
      );
      return {
        entityType: "vfx",
        entityId: command.targetId,
        cache: response.cache,
        payload: response
      };
    }

    const response = await this.areasService.processArea({
      areaId: command.targetId,
      bypassCache: command.options.bypassCache
    });
    return {
      entityType: "area",
      entityId: command.targetId,
      cache: response.cache,
      payload: response
    };
  }

  private enqueueLocal(jobId: string): void {
    if (this.queued.has(jobId)) {
      return;
    }
    this.queued.add(jobId);
    this.queue.push(jobId);
  }

  private async requireJob(jobId: string): Promise<ProcessingJobRecord> {
    const job = await this.repository.findById(jobId);
    if (!job) {
      throw new AppException({
        status: 404,
        code: "PROCESSING_JOB_NOT_FOUND",
        message: "Processing job was not found."
      });
    }
    return job;
  }

  private async publishQueued(job: ProcessingJobRecord): Promise<void> {
    try {
      const delivered = await this.publisher.publishQueued(job);
      job.publishCount += 1;
      job.lastPublishedAt = new Date().toISOString();
      job.updatedAt = job.lastPublishedAt;
      await this.repository.update(job);
      this.logger.debug(
        `Published queued processing job ${job.jobId} to Redis (${delivered} subscribers).`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to publish queued job ${job.jobId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
  }

  private async publishDeadLetter(job: ProcessingJobRecord): Promise<void> {
    try {
      const delivered = await this.publisher.publishDeadLetter(job);
      this.logger.warn(
        `Published dead-letter processing job ${job.jobId} to Redis (${delivered} subscribers).`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to publish dead-letter job ${job.jobId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
  }

  private async markCancelled(job: ProcessingJobRecord, reason: string): Promise<void> {
    const now = new Date().toISOString();
    job.status = "cancelled";
    job.cancelledAt = now;
    job.finishedAt = now;
    job.updatedAt = now;
    job.cancelledReason = reason;
    await this.repository.update(job);
  }
}

function toSummary(job: ProcessingJobRecord): ProcessingJobSummary {
  return {
    jobId: job.jobId,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    triggeredBy: job.triggeredBy,
    task: job.command.task,
    targetId: job.command.targetId,
    options: structuredClone(job.command.options),
    idempotencyKey: job.idempotencyKey,
    traceId: job.traceId,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    publishCount: job.publishCount,
    lastPublishedAt: job.lastPublishedAt,
    nextRetryAt: job.nextRetryAt,
    cancelRequested: job.cancelRequested,
    cancelledAt: job.cancelledAt,
    cancelledBy: job.cancelledBy,
    cancelledReason: job.cancelledReason,
    hasResult: Boolean(job.result),
    error: job.error ? structuredClone(job.error) : undefined
  };
}

function extractError(error: unknown): ProcessingJobError {
  if (error instanceof AppException) {
    return {
      code: error.code,
      message: error.message
    };
  }

  if (error instanceof Error) {
    return {
      code: "PROCESSING_JOB_EXECUTION_FAILED",
      message: error.message
    };
  }

  return {
    code: "PROCESSING_JOB_EXECUTION_FAILED",
    message: "Unknown processing job execution failure."
  };
}

function computeNextRetryAt(
  attemptCount: number,
  retryBaseDelayMs: number,
  retryMaxDelayMs: number
): string {
  const exponent = Math.max(attemptCount - 1, 0);
  const delay = Math.min(retryBaseDelayMs * Math.pow(2, exponent), retryMaxDelayMs);
  return new Date(Date.now() + delay).toISOString();
}

function isDuplicateEntryError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" && maybeCode.toUpperCase() === "ER_DUP_ENTRY";
}

function computeJobDurationMs(job: ProcessingJobRecord): number | null {
  if (!job.startedAt || !job.finishedAt) {
    return null;
  }

  const startedAtMs = Date.parse(job.startedAt);
  const finishedAtMs = Date.parse(job.finishedAt);
  if (Number.isNaN(startedAtMs) || Number.isNaN(finishedAtMs)) {
    return null;
  }

  const durationMs = finishedAtMs - startedAtMs;
  if (durationMs < 0) {
    return null;
  }
  return durationMs;
}

function calculatePercentileNearestRank(
  values: readonly number[],
  percentile: number
): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.ceil(percentile * sorted.length) - 1;
  const index = Math.min(Math.max(rank, 0), sorted.length - 1);
  return sorted[index];
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
