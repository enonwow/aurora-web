import type { ProcessingJobRecord } from "../../domain/processing-job.types";

export const PROCESSING_JOBS_PUBLISHER = Symbol("PROCESSING_JOBS_PUBLISHER");

export interface ProcessingJobsPublisherPort {
  publishQueued(job: ProcessingJobRecord): Promise<number>;
  publishDeadLetter(job: ProcessingJobRecord): Promise<number>;
}
