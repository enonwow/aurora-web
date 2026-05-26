import { Injectable } from "@nestjs/common";
import type { ProcessingJobsRepositoryPort } from "../../../application/ports/processing-jobs-repository.port";
import type { ProcessingJobRecord } from "../../../domain/processing-job.types";

@Injectable()
export class MemoryProcessingJobsRepository implements ProcessingJobsRepositoryPort {
  private readonly jobs = new Map<string, ProcessingJobRecord>();
  private readonly idempotencyIndex = new Map<string, string>();
  private readonly order: string[] = [];

  async create(job: ProcessingJobRecord): Promise<void> {
    const cloned = structuredClone(job);
    this.jobs.set(cloned.jobId, cloned);
    if (cloned.idempotencyKey) {
      this.idempotencyIndex.set(cloned.idempotencyKey, cloned.jobId);
    }
    if (!this.order.includes(cloned.jobId)) {
      this.order.unshift(cloned.jobId);
    }
  }

  async update(job: ProcessingJobRecord): Promise<void> {
    const cloned = structuredClone(job);
    this.jobs.set(cloned.jobId, cloned);
    if (cloned.idempotencyKey) {
      this.idempotencyIndex.set(cloned.idempotencyKey, cloned.jobId);
    }
    if (!this.order.includes(cloned.jobId)) {
      this.order.unshift(cloned.jobId);
    }
  }

  async findById(jobId: string): Promise<ProcessingJobRecord | null> {
    const found = this.jobs.get(jobId);
    return found ? structuredClone(found) : null;
  }

  async findByIdempotencyKey(
    idempotencyKey: string
  ): Promise<ProcessingJobRecord | null> {
    const jobId = this.idempotencyIndex.get(idempotencyKey);
    if (!jobId) {
      return null;
    }
    return this.findById(jobId);
  }

  async listRecent(limit: number): Promise<ProcessingJobRecord[]> {
    const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
    return this.order
      .slice(0, normalizedLimit)
      .map((jobId) => this.jobs.get(jobId))
      .filter((job): job is ProcessingJobRecord => Boolean(job))
      .map((job) => structuredClone(job));
  }

  async listRecoverable(limit: number): Promise<ProcessingJobRecord[]> {
    const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
    const now = Date.now();
    return this.order
      .map((jobId) => this.jobs.get(jobId))
      .filter((job): job is ProcessingJobRecord => Boolean(job))
      .filter((job) => {
        if (job.status !== "queued" && job.status !== "running") {
          return false;
        }
        if (job.cancelRequested) {
          return false;
        }
        if (!job.nextRetryAt) {
          return true;
        }
        return new Date(job.nextRetryAt).getTime() <= now;
      })
      .slice(0, normalizedLimit)
      .map((job) => structuredClone(job));
  }
}
