import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

const listQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  biome: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  benchmark: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

const areaProcessPayloadSchema = z.object({
  bypassCache: z.coerce.boolean().default(false)
});

const areaCacheKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[a-f0-9]+$/iu, "cacheKey must be hexadecimal.");

export function parseAreaListQuery(input: unknown) {
  const parsed = listQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Area list query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseAreaProcessPayload(input: unknown) {
  const parsed = areaProcessPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Area process payload validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseAreaCacheKey(input: unknown): string {
  const parsed = areaCacheKeySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Area cache key validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}
