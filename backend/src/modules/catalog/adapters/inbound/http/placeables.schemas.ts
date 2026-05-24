import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

const processPayloadSchema = z
  .object({
    templateId: z.string().trim().min(1).optional(),
    resref: z.string().trim().min(1).optional(),
    subtypeHint: z
      .enum([
        "generic",
        "door",
        "vfx",
        "vvx",
        "vvxy",
        "container",
        "light_source",
        "trigger_proxy"
      ])
      .optional(),
    bypassCache: z.coerce.boolean().default(false),
    includeBenchmarkMetadata: z.coerce.boolean().default(true)
  })
  .superRefine((value, context) => {
    if (!value.templateId && !value.resref) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["templateId"],
        message: "Either templateId or resref must be provided."
      });
    }
  });

const benchmarkPayloadSchema = z.object({
  templateIds: z.array(z.string().trim().min(1)).max(50).optional(),
  iterations: z.coerce.number().int().min(1).max(5000).default(200),
  warmupIterations: z.coerce.number().int().min(0).max(1000).default(20),
  bypassCache: z.coerce.boolean().default(true)
});

const cacheKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[a-f0-9]+$/iu, "cacheKey must be hexadecimal.");

export function parsePlaceableProcessPayload(input: unknown) {
  const parsed = processPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Placeable process payload validation failed.");
}

export function parsePlaceableBenchmarkPayload(input: unknown) {
  const parsed = benchmarkPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Placeable benchmark payload validation failed.");
}

export function parsePlaceableCacheKey(input: unknown): string {
  const parsed = cacheKeySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Placeable cache key validation failed.");
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
