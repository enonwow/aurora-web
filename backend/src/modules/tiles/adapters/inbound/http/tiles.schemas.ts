import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

const listQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  tileset: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  benchmark: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

const tileProcessPayloadSchema = z.object({
  bypassCache: z.coerce.boolean().default(false)
});

const tileBenchmarkPayloadSchema = z.object({
  tileIds: z.array(z.string().trim().min(1)).min(1).max(50).optional(),
  iterations: z.coerce.number().int().min(1).max(5000).default(200),
  warmupIterations: z.coerce.number().int().min(0).max(1000).default(20),
  bypassCache: z.coerce.boolean().default(true)
});

const tileCacheKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[a-f0-9]+$/iu, "cacheKey must be hexadecimal.");

export function parseTileListQuery(input: unknown) {
  const parsed = listQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Tile list query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseTileProcessPayload(input: unknown) {
  const parsed = tileProcessPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Tile process payload validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseTileBenchmarkPayload(input: unknown) {
  const parsed = tileBenchmarkPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Tile benchmark payload validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseTileCacheKey(input: unknown): string {
  const parsed = tileCacheKeySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Tile cache key validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}
