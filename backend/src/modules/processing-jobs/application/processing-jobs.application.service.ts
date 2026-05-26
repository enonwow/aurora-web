import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AppException } from "../../../common/http/app-exception";
import { AreasApplicationService } from "../../areas/application/areas.application.service";
import { CatalogApplicationService } from "../../catalog/application/catalog.application.service";
import type {
  ProcessingJobCreateCommand,
  ProcessingJobError,
  ProcessingJobExecutionResult,
  ProcessingJobRecord,
  ProcessingJobSummary,
  ProcessingJobTask
} from "../domain/processing-job.types";

@Injectable()
export class ProcessingJobsApplicationService {
  private readonly jobs = new Map<string, ProcessingJobRecord>();
  private readonly order: string[] = [];
  private readonly queue: string[] = [];
  private processing = false;

  constructor(
    private readonly catalogService: CatalogApplicationService,
    private readonly areasService: AreasApplicationService
  ) {}

  enqueueJob(
    command: ProcessingJobCreateCommand,
    triggeredBy: string
  ): ProcessingJobSummary {
    const job: ProcessingJobRecord = {
      jobId: randomUUID(),
      status: "queued",
      createdAt: new Date().toISOString(),
      triggeredBy,
      command
    };

    this.save(job);
    this.queue.push(job.jobId);
    this.scheduleDrain();
    return toSummary(job);
  }

  getJob(jobId: string): ProcessingJobSummary {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new AppException({
        status: 404,
        code: "PROCESSING_JOB_NOT_FOUND",
        message: "Processing job was not found."
      });
    }

    return toSummary(job);
  }

  getJobResult(jobId: string): ProcessingJobExecutionResult {
    const job = this.jobs.get(jobId);
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

  listJobs(limit = 20): ProcessingJobSummary[] {
    const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
    const selected = this.order.slice(0, normalizedLimit);
    return selected
      .map((jobId) => this.jobs.get(jobId))
      .filter((job): job is ProcessingJobRecord => Boolean(job))
      .map((job) => toSummary(job));
  }

  private scheduleDrain(): void {
    if (this.processing) {
      return;
    }
    void this.drainQueue();
  }

  private async drainQueue(): Promise<void> {
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

        const job = this.jobs.get(jobId);
        if (!job || job.status !== "queued") {
          continue;
        }

        job.status = "running";
        job.startedAt = new Date().toISOString();
        this.save(job);

        try {
          job.result = await this.executeJob(job.command);
          job.status = "completed";
        } catch (error) {
          job.error = extractError(error);
          job.status = "failed";
        } finally {
          job.finishedAt = new Date().toISOString();
          this.save(job);
        }
      }
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        this.scheduleDrain();
      }
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

  private save(job: ProcessingJobRecord): void {
    this.jobs.set(job.jobId, structuredClone(job));
    if (!this.order.includes(job.jobId)) {
      this.order.unshift(job.jobId);
    }
  }
}

function toSummary(job: ProcessingJobRecord): ProcessingJobSummary {
  return {
    jobId: job.jobId,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    triggeredBy: job.triggeredBy,
    task: job.command.task,
    targetId: job.command.targetId,
    options: structuredClone(job.command.options),
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
