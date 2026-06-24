import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";
import type { VfxBenchmarkCommand, VfxProcessCommand } from "../../../application/vfx-processing.types";
import type { AuroraMdlEmitterNode } from "../../../domain/aurora-mdl-vfx-source.parser";
import type { AuroraVfxEffectInstance } from "../../../domain/aurora-vfx-source.parser";

const sourceLayers = ["module", "hak", "vanilla", "external_fixture"] as const;
const packageKinds = ["source_parse", "runtime_package"] as const;
const resourceClasses = [
  "model",
  "source_model",
  "emitter_node",
  "texture",
  "txi",
  "material",
  "shader",
  "chunk_model",
  "sound",
  "progfx_row",
  "owner_slot"
] as const;

const sourceCandidateSchema = z.object({
  candidateId: z.string().trim().min(1).optional(),
  layer: z.enum(sourceLayers),
  resourceKind: z.enum(["table", "resource"]),
  resourceKey: z.string().trim().min(1),
  sourcePath: z.string().trim().min(1).optional(),
  hakName: z.string().trim().min(1).optional(),
  sourceHash: z.string().trim().min(1).optional(),
  tableHash: z.string().trim().min(1).optional(),
  resourceHash: z.string().trim().min(1).optional()
});

const dependencyCandidateSchema = z.object({
  sourceLayer: z.enum(sourceLayers),
  resourceKey: z.string().trim().min(1),
  sourcePath: z.string().trim().min(1).optional(),
  hakName: z.string().trim().min(1).optional(),
  sourceHash: z.string().trim().min(1).optional(),
  resourceHash: z.string().trim().min(1).optional(),
  precedenceRank: z.coerce.number().int().min(0).optional()
});

const resourceTraceSchema = z.object({
  requestedResourceClass: z.enum(resourceClasses),
  requestedRef: z.string().trim().min(1),
  ownerPath: z.string().trim().min(1).optional(),
  selectedCandidate: dependencyCandidateSchema.optional(),
  lowerPrecedenceCandidates: z.array(dependencyCandidateSchema).optional()
});

const runtimeSchema = z.object({
  dtSeconds: z.coerce.number().positive().optional(),
  particleLimit: z.coerce.number().int().positive().optional(),
  seed: z.coerce.number().int().positive().optional()
});

const vfxProcessPayloadSchema = z
  .object({
    packageKind: z.enum(packageKinds).default("runtime_package"),
    sourceTableText: z.string().min(1),
    sourceObjectKey: z.string().trim().min(1).optional(),
    sourceLayer: z.enum(sourceLayers).default("external_fixture"),
    sourceHash: z.string().trim().min(1).optional(),
    sourceProfile: z.string().trim().min(1).optional(),
    sourceRowId: z.coerce.number().int().min(0).optional(),
    selectedCandidateId: z.string().trim().min(1).optional(),
    selectedTableHash: z.string().trim().min(1).optional(),
    selectedResourceHash: z.string().trim().min(1).optional(),
    sourceCandidates: z.array(sourceCandidateSchema).optional(),
    resourceTraces: z.array(resourceTraceSchema).optional(),
    effectInstance: z.record(z.unknown()).optional(),
    sourceEmitter: z.record(z.unknown()).optional(),
    runtime: runtimeSchema.optional(),
    bypassCache: parseBooleanSchema().default(false),
    includeBenchmarkMetadata: parseBooleanSchema().default(false)
  })
  .transform((value): VfxProcessCommand => ({
    ...value,
    effectInstance: value.effectInstance as AuroraVfxEffectInstance | undefined,
    sourceEmitter: value.sourceEmitter as AuroraMdlEmitterNode | undefined
  }));

const vfxBenchmarkPayloadSchema = z
  .object({
    iterations: z.coerce.number().int().min(1).max(250).default(10),
    warmupIterations: z.coerce.number().int().min(0).max(100).default(1),
    bypassCache: parseBooleanSchema().default(true),
    sourceTableText: z.string().min(1).optional()
  })
  .transform((value): VfxBenchmarkCommand => value);

const cacheKeySchema = z.string().trim().regex(/^[a-f0-9]{64}$/iu);

export function parseVfxProcessPayload(input: unknown): VfxProcessCommand {
  const parsed = vfxProcessPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  throwValidationError(parsed.error.issues, "VFX process payload validation failed.");
}

export function parseVfxBenchmarkPayload(input: unknown): VfxBenchmarkCommand {
  const parsed = vfxBenchmarkPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  throwValidationError(parsed.error.issues, "VFX benchmark payload validation failed.");
}

export function parseVfxCacheKey(input: string): string {
  const parsed = cacheKeySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data.toLowerCase();
  }
  throwValidationError(parsed.error.issues, "VFX cache key validation failed.");
}

function parseBooleanSchema() {
  return z.preprocess((value) => {
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) {
        return true;
      }
      if (["false", "0", "no", "off"].includes(normalized)) {
        return false;
      }
    }
    return value;
  }, z.boolean());
}

function throwValidationError(issues: z.ZodIssue[], message: string): never {
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
