import type { PlaceableSubtypeInput } from "../../catalog/domain/template.types";

export const PROCESSING_JOB_TASKS = [
  "process_placeable",
  "process_creature",
  "process_item",
  "process_area"
] as const;

export type ProcessingJobTask = (typeof PROCESSING_JOB_TASKS)[number];

export interface ProcessingJobOptions {
  bypassCache: boolean;
  includeBenchmarkMetadata: boolean;
  subtypeHint?: PlaceableSubtypeInput;
}

export interface ProcessingJobCreateCommand {
  task: ProcessingJobTask;
  targetId: string;
  options: ProcessingJobOptions;
}

export type ProcessingJobStatus = "queued" | "running" | "completed" | "failed";

export interface ProcessingJobError {
  code: string;
  message: string;
}

export interface ProcessingJobExecutionResult {
  entityType: "placeable" | "creature" | "item" | "area";
  entityId: string;
  cache: {
    key: string;
    hit: boolean;
    storedAt: string;
    hits: number;
  };
  payload: unknown;
}

export interface ProcessingJobRecord {
  jobId: string;
  status: ProcessingJobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  triggeredBy: string;
  command: ProcessingJobCreateCommand;
  error?: ProcessingJobError;
  result?: ProcessingJobExecutionResult;
}

export interface ProcessingJobSummary {
  jobId: string;
  status: ProcessingJobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  triggeredBy: string;
  task: ProcessingJobTask;
  targetId: string;
  options: ProcessingJobOptions;
  hasResult: boolean;
  error?: ProcessingJobError;
}
