import { AppException } from "../../../../../common/http/app-exception";
import {
  runtimeSettingsPayloadSchema,
  type RuntimeSettingsPayloadDto
} from "../../../domain/runtime-settings.schema";
import { z } from "zod";

export const TEXTURE_INDEX_QUERY_DEFAULT_LIMIT = 100;
export const TEXTURE_INDEX_QUERY_DEFAULT_OFFSET = 0;

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

const textureIndexQuerySchema = z
  .object({
    resref: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional(),
    offset: z.coerce.number().int().min(0).optional()
  })
  .transform((input) => {
    const trimmedResref =
      typeof input.resref === "string" ? input.resref.trim() : undefined;

    return {
      resref: trimmedResref && trimmedResref.length > 0 ? trimmedResref : undefined,
      limit: input.limit ?? TEXTURE_INDEX_QUERY_DEFAULT_LIMIT,
      offset: input.offset ?? TEXTURE_INDEX_QUERY_DEFAULT_OFFSET
    };
  });

const textureDeliveryQuerySchema = z
  .object({
    textureIds: z
      .union([z.string(), z.array(z.string())])
      .optional(),
    resref: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional(),
    offset: z.coerce.number().int().min(0).optional()
  })
  .transform((input) => {
    const normalizedTextureIds = normalizeTextureIds(input.textureIds);
    const trimmedResref =
      typeof input.resref === "string" ? input.resref.trim().toLowerCase() : undefined;

    return {
      textureIds: normalizedTextureIds.length > 0 ? normalizedTextureIds : undefined,
      resref: trimmedResref && trimmedResref.length > 0 ? trimmedResref : undefined,
      limit: input.limit ?? TEXTURE_INDEX_QUERY_DEFAULT_LIMIT,
      offset: input.offset ?? TEXTURE_INDEX_QUERY_DEFAULT_OFFSET
    };
  });

const textureIdParamSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f0-9]{24}$/u, {
    message: "Texture id must be a 24-character lowercase hex string."
  });

const vanillaTileModelSourceSyncBodySchema = z
  .object({
    modelResRefs: z.array(z.string()).optional()
  })
  .transform((input) => ({
    modelResRefs: normalizeModelResRefs(input.modelResRefs)
  }));

const placeableModelSourceSyncBodySchema = z
  .object({
    appearanceTypes: z.array(z.coerce.number().int().min(0)).optional(),
    modelResRefs: z.array(z.string()).optional()
  })
  .transform((input) => ({
    appearanceTypes: normalizeAppearanceTypes(input.appearanceTypes),
    modelResRefs: normalizeModelResRefs(input.modelResRefs)
  }));

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

export function parseTextureIndexQuery(input: unknown): {
  resref?: string;
  limit: number;
  offset: number;
} {
  const parsed = textureIndexQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Texture index query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseTextureDeliveryQuery(input: unknown): {
  textureIds?: string[];
  resref?: string;
  limit: number;
  offset: number;
} {
  const parsed = textureDeliveryQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Texture delivery query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseTextureIdParam(input: unknown): string {
  const parsed = textureIdParamSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Texture id validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parseVanillaTileModelSourceSyncBody(input: unknown): {
  modelResRefs: string[];
} {
  const parsed = vanillaTileModelSourceSyncBodySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Vanilla tile model source sync request validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parsePlaceableModelSourceSyncBody(input: unknown): {
  appearanceTypes: number[];
  modelResRefs: string[];
} {
  const parsed = placeableModelSourceSyncBodySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Placeable model source sync request validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

function normalizeAppearanceTypes(values: number[] | undefined): number[] {
  const normalized = new Set<number>();
  for (const value of values ?? []) {
    if (Number.isInteger(value) && value >= 0) {
      normalized.add(value);
    }
  }
  return [...normalized].sort((left, right) => left - right);
}

function normalizeModelResRefs(values: string[] | undefined): string[] {
  const normalized = new Set<string>();
  for (const value of values ?? []) {
    const resref = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/gu, "_").slice(0, 64);
    if (resref && resref !== "____" && /[a-z0-9]/u.test(resref)) {
      normalized.add(resref);
    }
  }
  return [...normalized].sort((left, right) => left.localeCompare(right));
}

function normalizeTextureIds(input: string | string[] | undefined): string[] {
  if (!input) {
    return [];
  }

  const source = Array.isArray(input) ? input : [input];
  const output: string[] = [];
  const unique = new Set<string>();

  for (const value of source) {
    for (const part of value.split(",")) {
      const normalized = part.trim().toLowerCase();
      if (!normalized) {
        continue;
      }
      if (!/^[a-f0-9]{24}$/u.test(normalized)) {
        throw new AppException({
          status: 422,
          code: "VALIDATION_FAILED",
          message: "Texture delivery query validation failed.",
          details: [
            {
              path: "textureIds",
              reason: "Each texture id must be a 24-character lowercase hex string."
            }
          ]
        });
      }
      if (unique.has(normalized)) {
        continue;
      }
      unique.add(normalized);
      output.push(normalized);
    }
  }

  return output;
}
