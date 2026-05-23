import { z } from "zod";

const nonEmptyPathSchema = z.string().trim().min(1);
const optionalPathSchema = z.string().trim();
const optionalConfigValueSchema = z.string().trim();
const hakPriorityListSchema = z.array(z.string().trim().min(1)).default([]);

const runtimePathSettingsSchema = z
  .object({
    vanillaDataPath: nonEmptyPathSchema,
    hakDirectoryPath: nonEmptyPathSchema,
    moduleDecompiledPath: optionalPathSchema,
    modulePackedPath: optionalPathSchema,
    tlkBasePath: nonEmptyPathSchema,
    tlkCustomPath: optionalPathSchema
  })
  .superRefine((value, context) => {
    const hasDecompiledPath = value.moduleDecompiledPath.length > 0;
    const hasPackedPath = value.modulePackedPath.length > 0;

    if (!hasDecompiledPath && !hasPackedPath) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["moduleDecompiledPath"],
        message:
          "At least one module source path is required: moduleDecompiledPath or modulePackedPath."
      });
    }
  });

const blobStorageSettingsSchema = z.object({
  endpoint: optionalConfigValueSchema,
  region: optionalConfigValueSchema,
  bucket: optionalConfigValueSchema,
  modulePrefix: optionalConfigValueSchema,
  accessKeyId: optionalConfigValueSchema,
  secretAccessKey: optionalConfigValueSchema,
  forcePathStyle: z.boolean()
});

const runtimeSourceSettingsSchema = z.object({
  includeModuleTemp0: z.boolean(),
  includeModulePacked: z.boolean(),
  includeHaks: z.boolean(),
  includeVanilla: z.boolean(),
  hakProfileId: optionalConfigValueSchema.default(""),
  hakPriorityList: hakPriorityListSchema
});

const hakProfileEntrySchema = z.array(z.string().trim().min(1));
const hakProfilesSchema = z.record(z.string().trim().min(1), hakProfileEntrySchema);

const benchmarkCandidateMetricsSchema = z.object({
  triangles: z.number().int().nonnegative(),
  meshes: z.number().int().nonnegative(),
  emitters: z.number().int().nonnegative(),
  maxSingleMeshTriangles: z.number().int().nonnegative().optional()
});

const benchmarkCandidateContextSchema = z.object({
  source: z.string().trim().min(1),
  areaResref: z.string().trim().min(1).optional(),
  doorIndex: z.number().int().nonnegative().optional(),
  note: z.string().trim().min(1).optional()
});

const benchmarkCandidateSchema = z.object({
  resref: z.string().trim().min(1),
  metrics: benchmarkCandidateMetricsSchema,
  context: benchmarkCandidateContextSchema
});

const benchmarkCandidatesSettingsSchema = z.object({
  placeableHeavyNoVfx: benchmarkCandidateSchema,
  placeableHeavyVfx: benchmarkCandidateSchema,
  placeableVfxPlcAlternative: benchmarkCandidateSchema,
  doorHeavyInstance: benchmarkCandidateSchema,
  doorHeavySingleMesh: benchmarkCandidateSchema
});

const runtimeSettingsPayloadObjectSchema = z.object({
  paths: runtimePathSettingsSchema,
  blobStorage: blobStorageSettingsSchema,
  telemetryDebugMode: z.enum(["off", "basic", "full"]),
  hakProfiles: hakProfilesSchema.default({}),
  sources: z.object({
    placeable: runtimeSourceSettingsSchema,
    tile: runtimeSourceSettingsSchema,
    area: runtimeSourceSettingsSchema,
    sound: runtimeSourceSettingsSchema
  }),
  benchmarkCandidates: benchmarkCandidatesSettingsSchema
});

export const runtimeSettingsPayloadSchema = runtimeSettingsPayloadObjectSchema.superRefine(
  validateRuntimeSettingsCrossFieldRules
);

export const runtimeSettingsRecordSchema = runtimeSettingsPayloadObjectSchema
  .extend({
  revision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  updatedBy: z.string().trim().min(1)
  })
  .superRefine(validateRuntimeSettingsCrossFieldRules);

function validateRuntimeSettingsCrossFieldRules(
  value: {
    paths: { modulePackedPath: string };
    blobStorage: { bucket: string };
    hakProfiles: Record<string, string[]>;
    sources: {
      placeable: { hakProfileId: string };
      tile: { hakProfileId: string };
      area: { hakProfileId: string };
      sound: { hakProfileId: string };
    };
  },
  context: z.RefinementCtx
): void {
  if (
    value.paths.modulePackedPath.length > 0 &&
    value.blobStorage.bucket.length === 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["blobStorage", "bucket"],
      message:
        "blobStorage.bucket is required when paths.modulePackedPath is configured."
    });
  }

  const sourceKinds = ["placeable", "tile", "area", "sound"] as const;
  for (const sourceKind of sourceKinds) {
    const profileId = value.sources[sourceKind].hakProfileId.trim();
    if (profileId.length === 0) {
      continue;
    }

    if (!(profileId in value.hakProfiles)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sources", sourceKind, "hakProfileId"],
        message: `hakProfileId "${profileId}" does not exist in hakProfiles.`
      });
    }
  }
}

export type RuntimeSettingsPayloadDto = z.infer<typeof runtimeSettingsPayloadSchema>;
export type RuntimeSettingsRecordDto = z.infer<typeof runtimeSettingsRecordSchema>;
