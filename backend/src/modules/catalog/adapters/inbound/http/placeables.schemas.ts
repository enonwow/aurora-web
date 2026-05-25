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

const assetIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(64)
  .regex(/^[a-f0-9]+$/iu, "assetId must be hexadecimal.");

const assetDeliveryQuerySchema = z.object({
  assetIds: z.union([z.string(), z.array(z.string())]).optional()
});

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

export function parsePlaceableAssetId(input: unknown): string {
  const parsed = assetIdSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Placeable asset id validation failed.");
}

export function parsePlaceableAssetDeliveryQuery(
  input: unknown
): { assetIds?: string[] } {
  const parsed = assetDeliveryQuerySchema.safeParse(input);
  if (!parsed.success) {
    throwValidationError(
      parsed.error.issues,
      "Placeable asset delivery query validation failed."
    );
  }

  const rawAssetIds = parsed.data.assetIds;
  if (!rawAssetIds) {
    return {};
  }

  const tokens = (Array.isArray(rawAssetIds) ? rawAssetIds : [rawAssetIds])
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (tokens.length === 0) {
    return {};
  }

  const assetIds = tokens.map((token) => {
    const tokenParsed = assetIdSchema.safeParse(token);
    if (tokenParsed.success) {
      return tokenParsed.data;
    }

    throwValidationError(
      tokenParsed.error.issues,
      "Placeable asset delivery query validation failed."
    );
  });

  return { assetIds };
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
