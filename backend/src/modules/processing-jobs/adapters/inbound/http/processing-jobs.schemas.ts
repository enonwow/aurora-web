import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";
import type {
  ProcessingJobCreateCommand,
  ProcessingJobTask
} from "../../../domain/processing-job.types";

const jobTasks = [
  "process_placeable",
  "process_creature",
  "process_item",
  "process_area",
  "process_vfx_runtime_package"
] as const;

const placeableSubtypeHints = [
  "generic",
  "door",
  "vfx",
  "vvx",
  "vvxy",
  "container",
  "light_source",
  "trigger_proxy"
] as const;

const jobIdParamSchema = z.object({
  jobId: z.string().uuid()
});

const jobListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(20)
});

const jobMetricsQuerySchema = z.object({
  windowSize: z.coerce.number().int().min(1).max(10_000).default(1000)
});

const jobActionPayloadSchema = z.object({
  reason: z.string().trim().min(1).max(256).optional()
});

const jobStatusBatchPayloadSchema = z
  .object({
    jobIds: z.array(z.string().uuid()).min(1).max(200)
  })
  .transform((value) => ({
    jobIds: dedupeStrings(value.jobIds)
  }));

const createJobPayloadSchema = z
  .object({
    task: z.enum(jobTasks),
    targetId: z.string().trim().min(1),
    idempotencyKey: z.string().trim().min(1).max(128).optional(),
    traceId: z.string().trim().min(1).max(128).optional(),
    options: z
      .object({
        bypassCache: parseBooleanSchema().optional(),
        includeBenchmarkMetadata: parseBooleanSchema().optional(),
        subtypeHint: z.enum(placeableSubtypeHints).optional(),
        vfx: z.record(z.unknown()).optional()
      })
      .optional()
  })
  .superRefine((value, context) => {
    const hasSubtypeHint = Boolean(value.options?.subtypeHint);
    if (value.task !== "process_placeable" && hasSubtypeHint) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options", "subtypeHint"],
        message: "subtypeHint is only allowed for process_placeable jobs."
      });
    }
    if (value.task !== "process_vfx_runtime_package" && value.options?.vfx) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options", "vfx"],
        message: "vfx options are only allowed for process_vfx_runtime_package jobs."
      });
    }
  })
  .transform((value): ProcessingJobCreateCommand => ({
    task: value.task as ProcessingJobTask,
    targetId: value.targetId,
    idempotencyKey: value.idempotencyKey,
    traceId: value.traceId,
    options: {
      bypassCache: value.options?.bypassCache ?? true,
      includeBenchmarkMetadata: value.options?.includeBenchmarkMetadata ?? true,
      subtypeHint: value.options?.subtypeHint,
      ...(value.options?.vfx ? { vfx: value.options.vfx } : {})
    }
  }));

export function parseCreateJobPayload(input: unknown): ProcessingJobCreateCommand {
  const parsed = createJobPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Processing job payload validation failed.");
}

export function parseJobIdParams(input: unknown): { jobId: string } {
  const parsed = jobIdParamSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Processing job params validation failed.");
}

export function parseJobListQuery(input: unknown): { limit: number } {
  const parsed = jobListQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Processing job list query validation failed.");
}

export function parseJobMetricsQuery(input: unknown): { windowSize: number } {
  const parsed = jobMetricsQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Processing job metrics query validation failed.");
}

export function parseJobActionPayload(input: unknown): { reason?: string } {
  const parsed = jobActionPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Processing job action payload validation failed.");
}

export function parseJobStatusBatchPayload(input: unknown): { jobIds: string[] } {
  const parsed = jobStatusBatchPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(
    parsed.error.issues,
    "Processing job status batch payload validation failed."
  );
}

function parseBooleanSchema() {
  return z.preprocess((input) => {
    if (typeof input === "boolean") {
      return input;
    }
    if (typeof input === "number") {
      if (input === 1) {
        return true;
      }
      if (input === 0) {
        return false;
      }
    }
    if (typeof input === "string") {
      const normalized = input.trim().toLowerCase();
      if (["1", "true", "yes", "on"].includes(normalized)) {
        return true;
      }
      if (["0", "false", "no", "off"].includes(normalized)) {
        return false;
      }
    }
    return input;
  }, z.boolean());
}

function throwValidationError(
  issues: Array<{ path: Array<string | number>; message: string }>,
  message: string
): never {
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message,
    details: issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

function dedupeStrings(values: readonly string[]): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    deduped.push(value);
  }
  return deduped;
}
