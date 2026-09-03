import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";
import type { VfxBenchmarkCommand, VfxProcessCommand } from "../../../application/vfx-processing.types";
import type { AuroraMdlEmitterNode } from "../../../domain/aurora-mdl-vfx-source.parser";
import type { AuroraVfxEffectInstance } from "../../../domain/aurora-vfx-source.parser";
import { createAuroraAreaVfxSceneCollisionContext } from "../../../domain/aurora-vfx-area-collision";

const sourceLayers = ["module", "hak", "vanilla", "external_fixture"] as const;
const packageKinds = ["source_parse", "runtime_package", "model_graph_runtime"] as const;
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

const shaderSourceRecordSchema = z.object({
  resref: z.string().trim().min(1),
  source: z.string().min(1).max(512_000),
  includeRefs: z.array(z.string().trim().min(1)).max(128),
  sourceAssetId: z.string().trim().min(1).optional(),
  sourceObjectKey: z.string().trim().min(1).optional()
});

const shaderProgramSourceSchema = z.object({
  version: z.literal("aurora-shader-program-source/v1"),
  status: z.enum(["complete", "incomplete"]),
  stageRoots: z.object({
    vertex: z.string().trim().min(1).optional(),
    fragment: z.string().trim().min(1).optional(),
    geometry: z.string().trim().min(1).optional()
  }),
  sources: z.array(shaderSourceRecordSchema).max(128),
  unresolvedRefs: z.array(z.string().trim().min(1)).max(128)
});

const materialShaderParameterSchema = z
  .object({
    name: z.string().trim().min(1).max(256),
    kind: z.enum(["float", "int"]),
    values: z.array(z.coerce.number().finite()).min(1).max(4),
    arity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
  })
  .superRefine((parameter, context) => {
    if (parameter.values.length !== parameter.arity) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["values"],
        message: "MTR parameter value count must match arity."
      });
    }
    if (
      parameter.kind === "int" &&
      (parameter.arity !== 1 || !Number.isInteger(parameter.values[0]))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["values"],
        message: "MTR int parameters require exactly one integer value."
      });
    }
  });

const effectBeamAttachmentVectorSchema = z.object({
  x: z.coerce.number().finite(),
  y: z.coerce.number().finite(),
  z: z.coerce.number().finite()
});

const effectBeamAttachmentOrientationSchema = z.object({
  axis: z.tuple([
    z.coerce.number().finite(),
    z.coerce.number().finite(),
    z.coerce.number().finite()
  ]),
  angleRadians: z.coerce.number().finite()
});

const effectBeamAttachmentObjectTransformSchema = z.object({
  position: effectBeamAttachmentVectorSchema,
  orientation: effectBeamAttachmentOrientationSchema.optional(),
  scale: z.coerce.number().finite().optional()
});

const effectBeamAttachmentAnimationSchema = z.object({
  animationName: z.string().trim().min(1),
  startTimeSeconds: z.coerce.number().nonnegative().optional(),
  timeScale: z.coerce.number().finite().optional(),
  loop: z.boolean().optional(),
  lengthSeconds: z.coerce.number().positive().optional(),
  blendWeight: z.coerce.number().min(0).max(1).optional()
});

const effectBeamAttachmentModelGraphSchema = z.object({
  version: z.literal("aurora-mdl-model-graph/v1"),
  sourceFormat: z.enum(["aurora-mdl-ascii", "aurora-mdl-binary"]),
  sourceModelObjectKey: z.string().trim().min(1).optional(),
  sourceModelFileName: z.string().trim().min(1).optional(),
  sourceModelHash: z.string().trim().min(1),
  nodes: z.array(z.record(z.unknown())).min(1).max(16384),
  animationEvents: z.array(z.record(z.unknown())).max(4096).default([]),
  propagationEvents: z.array(z.record(z.unknown())).max(4096).default([])
});

const effectBeamAttachmentHostSchema = z.object({
  ref: z.string().trim().min(1).optional(),
  bodyNode: z.coerce.number().int().min(0).max(2),
  modelGraph: effectBeamAttachmentModelGraphSchema,
  objectTransform: effectBeamAttachmentObjectTransformSchema,
  animation: effectBeamAttachmentAnimationSchema.optional()
});

const effectBeamAttachmentRuntimeSchema = z.object({
  version: z.literal("aurora-effect-beam-host-runtime/v1"),
  runtimeProfileId: z.string().trim().min(1),
  source: effectBeamAttachmentHostSchema,
  target: effectBeamAttachmentHostSchema
});

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

const runtimeVector3Schema = z.object({
  x: z.coerce.number().finite(),
  y: z.coerce.number().finite(),
  z: z.coerce.number().finite()
});

const areaVfxWalkmeshDiagnosticSchema = z.object({
  code: z.string().trim().min(1),
  severity: z.enum(["info", "warn", "error"]),
  message: z.string().min(1)
});

const areaVfxWalkmeshSchema = z.object({
  version: z.literal("aurora-wok-walkmesh/v1"),
  sourceFormat: z.literal("aurora-wok-ascii"),
  resourceName: z.string().trim().min(1).optional(),
  nodes: z
    .array(
      z.object({
        nodeName: z.string().trim().min(1),
        position: runtimeVector3Schema.optional(),
        orientationRaw: z
          .tuple([
            z.coerce.number().finite(),
            z.coerce.number().finite(),
            z.coerce.number().finite(),
            z.coerce.number().finite()
          ])
          .optional(),
        vertices: z.array(runtimeVector3Schema).max(250_000),
        faces: z
          .array(
            z.object({
              vertexIndices: z.tuple([
                z.coerce.number().int().nonnegative(),
                z.coerce.number().int().nonnegative(),
                z.coerce.number().int().nonnegative()
              ]),
              rawTokens: z.array(z.coerce.number().finite()).max(64),
              sourceLineNumber: z.coerce.number().int().positive()
            })
          )
          .max(250_000),
        aabbRecords: z
          .array(
            z.object({
              rawTokens: z.array(z.coerce.number().finite()).max(64),
              sourceLineNumber: z.coerce.number().int().positive(),
              boundsMin: runtimeVector3Schema.optional(),
              boundsMax: runtimeVector3Schema.optional(),
              faceIndex: z.coerce.number().int().optional(),
              planeMask: z.coerce.number().int().optional(),
              planeMaskSource: z
                .enum([
                  "source-token",
                  "aurora-derived-child-bounds",
                  "aurora-default-zero"
                ])
                .optional(),
              childRecordIndices: z
                .tuple([
                  z.coerce.number().int().nonnegative(),
                  z.coerce.number().int().nonnegative()
                ])
                .optional()
            })
          )
          .max(250_000)
      })
    )
    .max(4096),
  diagnostics: z.array(areaVfxWalkmeshDiagnosticSchema).max(4096)
});

const areaVfxCollisionContractSchema = z.object({
  version: z.literal("aurora-area-vfx-collision/v1"),
  coordinateSpace: z.literal("aurora-area-z-up"),
  unitsPerTile: z.literal(10),
  status: z.enum(["ready", "partial", "unavailable"]),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/iu),
  resources: z
    .array(
      z.object({
        resourceId: z.string().trim().min(1),
        modelResRef: z.string().trim().min(1),
        sourceObjectKey: z.string().trim().min(1),
        sourceLayer: z.enum(["module", "hak", "vanilla"]),
        sourceHash: z.string().regex(/^[a-f0-9]{64}$/iu),
        walkmesh: areaVfxWalkmeshSchema
      })
    )
    .max(4096),
  instances: z
    .array(
      z.object({
        instanceId: z.string().trim().min(1),
        resourceId: z.string().trim().min(1),
        translation: runtimeVector3Schema,
        orientationQuarterTurns: z.coerce.number().int().min(0).max(3)
      })
    )
    .max(65_536),
  diagnostics: z
    .array(
      areaVfxWalkmeshDiagnosticSchema.extend({
        modelResRef: z.string().trim().min(1).optional(),
        tileInstanceId: z.string().trim().min(1).optional()
      })
    )
    .max(65_536)
});

const areaVfxSceneCollisionSchema = z.object({
  version: z.literal("aurora-area-vfx-scene-collision/v1"),
  area: areaVfxCollisionContractSchema,
  objectTransform: z.object({
    translation: runtimeVector3Schema,
    bearingRadians: z.coerce.number().finite(),
    visualTransform: z.object({
      scaleX: z.coerce.number().positive(),
      scaleY: z.coerce.number().positive(),
      scaleZ: z.coerce.number().positive(),
      offsetX: z.coerce.number().finite(),
      offsetY: z.coerce.number().finite(),
      offsetZ: z.coerce.number().finite(),
      pitch: z.coerce.number().finite(),
      roll: z.coerce.number().finite(),
      yaw: z.coerce.number().finite()
    })
  })
});

const windNoiseGridSchema = z.array(z.coerce.number().finite()).length(16 * 16);

const windManagerSchema = z.object({
  profileId: z.string().trim().min(1),
  globalWindVector: runtimeVector3Schema,
  variationYawRadians: z.coerce.number().finite().optional(),
  variationPitchRadians: z.coerce.number().finite().optional(),
  noisePeriodSeconds: z.coerce.number().positive().optional(),
  noiseElapsedSeconds: z.coerce.number().nonnegative().optional(),
  noiseGridPrevious16x16: windNoiseGridSchema.optional(),
  noiseGridCurrent16x16: windNoiseGridSchema.optional(),
  noiseSeed: z.coerce.number().int().nonnegative().optional(),
  pointSources: z
    .array(
      z.object({
        position: runtimeVector3Schema,
        radius: z.coerce.number().positive(),
        durationSeconds: z.coerce.number().nonnegative(),
        timeRemainingSeconds: z.coerce.number().nonnegative().optional(),
        intensity: z.coerce.number().finite(),
        sourceEmitterNodeName: z.string().trim().min(1).optional()
      })
    )
    .optional()
});

const runtimeSchema = z.object({
  dtSeconds: z.coerce.number().positive().optional(),
  simulationStepSeconds: z.coerce.number().positive().optional(),
  tickCount: z.coerce.number().int().min(1).max(4096).optional(),
  executionParticleBudget: z.coerce.number().int().min(1).max(65_536).optional(),
  particleLimit: z.coerce.number().int().positive().optional(),
  seed: z.coerce.number().int().positive().optional(),
  animation: z
    .object({
      animationName: z.string().trim().min(1),
      previousTimeSeconds: z.coerce.number().min(0).optional(),
      currentTimeSeconds: z.coerce.number().min(0),
      blendWeight: z.coerce.number().min(0).max(1).optional()
    })
    .optional(),
  windManager: windManagerSchema.optional(),
  cameraPosition: runtimeVector3Schema.optional(),
  cameraContextSource: z.enum([
    "aurora-active-camera-world-position",
    "proof-calibrated-camera-relative-to-vfx-owner"
  ]).optional(),
  effectBeamAttachmentRuntime: effectBeamAttachmentRuntimeSchema.optional(),
  areaCollision: areaVfxSceneCollisionSchema.optional()
});

const vfxProcessPayloadSchema = z
  .object({
    packageKind: z.enum(packageKinds).default("runtime_package"),
    sourceTableText: z.string().min(1).optional(),
    progFxTableText: z.string().min(1).optional(),
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
    sourceEmitters: z.array(z.record(z.unknown())).optional(),
    sourceEmitterMaterials: z
      .array(
        z.object({
          emitterIndex: z.coerce.number().int().nonnegative(),
          emitterNodeName: z.string().trim().min(1),
          materialState: z.object({
            source: z.literal("aurora-mtr"),
            materialRef: z.string().trim().min(1).optional(),
            renderHint: z.string().trim().min(1).optional(),
            customShaderVS: z.string().trim().min(1).optional(),
            customShaderFS: z.string().trim().min(1).optional(),
            customShaderGS: z.string().trim().min(1).optional(),
            customShaderProgram: shaderProgramSourceSchema.optional(),
            parameters: z.array(materialShaderParameterSchema).max(256).optional(),
            transparency: z.boolean().optional(),
            twoSided: z.boolean().optional(),
            sampleFramebuffer: z.coerce.number().int().optional(),
            volumetric: z.boolean().optional()
          })
        })
      )
      .optional(),
    sourceAnimationEvents: z
      .array(
        z.object({
          time: z.coerce.number().nonnegative(),
          type: z.string().trim().min(1),
          animationName: z.string().trim().min(1).optional()
        })
      )
      .optional(),
    sourceModelGraph: z
      .object({
        animationEvents: z
          .array(
            z.object({
              time: z.coerce.number().nonnegative(),
              type: z.string().trim().min(1),
              animationName: z.string().trim().min(1).optional()
            })
          )
          .optional(),
        nodes: z.array(z.record(z.unknown()))
      })
      .optional(),
    runtime: runtimeSchema.optional(),
    bypassCache: parseBooleanSchema().default(false),
    includeBenchmarkMetadata: parseBooleanSchema().default(false)
  })
  .superRefine((value, context) => {
    if (value.packageKind !== "model_graph_runtime" && !value.sourceTableText) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceTableText"],
        message: "sourceTableText is required for 2DA-backed VFX packages."
      });
    }
    if (value.packageKind === "model_graph_runtime" && !value.sourceEmitter && !value.sourceEmitters?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceEmitters"],
        message: "model_graph_runtime requires sourceEmitter or sourceEmitters."
      });
    }
  })
  .transform((value): VfxProcessCommand => {
    const { runtime: rawRuntime, ...command } = value;
    const { areaCollision, ...runtime } = rawRuntime ?? {};
    return {
      ...command,
      ...(rawRuntime
        ? {
            runtime: {
              ...runtime,
              ...(areaCollision
                ? {
                    context: {
                      collisionContext: createAuroraAreaVfxSceneCollisionContext(areaCollision)
                    }
                  }
                : {})
            } as NonNullable<VfxProcessCommand["runtime"]>
          }
        : {}),
      effectInstance: value.effectInstance as AuroraVfxEffectInstance | undefined,
      sourceEmitter: value.sourceEmitter as AuroraMdlEmitterNode | undefined,
      sourceEmitters: value.sourceEmitters as AuroraMdlEmitterNode[] | undefined,
      sourceEmitterMaterials: value.sourceEmitterMaterials,
      sourceAnimationEvents: value.sourceAnimationEvents,
      sourceModelGraph: value.sourceModelGraph as VfxProcessCommand["sourceModelGraph"]
    };
  });

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
