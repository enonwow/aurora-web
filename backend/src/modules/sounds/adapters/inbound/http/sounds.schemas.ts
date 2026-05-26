import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

const listQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  category: z.enum(["ambient", "music", "effect"]).optional(),
  tag: z.string().trim().min(1).optional(),
  benchmark: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

const soundProcessPayloadSchema = z.object({
  bypassCache: z.coerce.boolean().default(false)
});

const soundBenchmarkPayloadSchema = z.object({
  soundIds: z.array(z.string().trim().min(1)).min(1).max(50).optional(),
  iterations: z.coerce.number().int().min(1).max(5000).default(200),
  warmupIterations: z.coerce.number().int().min(0).max(1000).default(20),
  bypassCache: z.coerce.boolean().default(true)
});

const soundCacheKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[a-f0-9]+$/iu, "cacheKey must be hexadecimal.");

const soundAudioDeliveryQuerySchema = z.object({
  mode: z.enum(["proxy", "direct"]).default("proxy")
});

export function parseSoundListQuery(input: unknown) {
  const parsed = listQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Sound list query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseSoundProcessPayload(input: unknown) {
  const parsed = soundProcessPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Sound process payload validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseSoundBenchmarkPayload(input: unknown) {
  const parsed = soundBenchmarkPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Sound benchmark payload validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseSoundCacheKey(input: unknown): string {
  const parsed = soundCacheKeySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Sound cache key validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseSoundAudioDeliveryQuery(
  input: unknown
): { mode: "proxy" | "direct" } {
  const parsed = soundAudioDeliveryQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Sound delivery query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}
