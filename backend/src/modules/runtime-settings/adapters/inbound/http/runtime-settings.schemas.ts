import { AppException } from "../../../../../common/http/app-exception";
import {
  runtimeSettingsPayloadSchema,
  type RuntimeSettingsPayloadDto
} from "../../../domain/runtime-settings.schema";
import { z } from "zod";

const moduleCacheSummaryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(200)
});

const moduleCacheRebuildQuerySchema = z.object({
  forceFull: z
    .preprocess((input) => {
      if (typeof input === "string") {
        const normalized = input.trim().toLowerCase();
        if (normalized === "true") {
          return true;
        }
        if (normalized === "false") {
          return false;
        }
      }
      return input;
    }, z.boolean())
    .optional()
    .default(false)
});

export function parseReplaceRuntimeSettingsRequest(
  input: unknown
): RuntimeSettingsPayloadDto {
  const parsed = runtimeSettingsPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Runtime settings validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseModuleCacheSummaryQuery(input: unknown): { limit: number } {
  const parsed = moduleCacheSummaryQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Module cache summary query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseModuleCacheRebuildQuery(input: unknown): { forceFull: boolean } {
  const parsed = moduleCacheRebuildQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Module cache rebuild query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}
