import type { ProcessingJobRecord } from "../../domain/processing-job.types";

export const PROCESSING_JOBS_REPOSITORY = Symbol("PROCESSING_JOBS_REPOSITORY");

export interface ProcessingJobsRepositoryPort {
  create(job: ProcessingJobRecord): Promise<void>;
  update(job: ProcessingJobRecord): Promise<void>;
  findById(jobId: string): Promise<ProcessingJobRecord | null>;
  findByIds(jobIds: string[]): Promise<ProcessingJobRecord[]>;
  findByIdempotencyKey(idempotencyKey: string): Promise<ProcessingJobRecord | null>;
  listRecent(limit: number): Promise<ProcessingJobRecord[]>;
  listRecoverable(limit: number): Promise<ProcessingJobRecord[]>;
}
