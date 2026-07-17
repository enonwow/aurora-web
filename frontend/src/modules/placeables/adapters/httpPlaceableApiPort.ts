import { z } from "zod";
import type {
  PlaceableApiAssetContractsResult,
  PlaceableApiAssetContractsBatchRequestItem,
  PlaceableApiAssetContractsBatchResult,
  PlaceableApiAssetManifest,
  PlaceableRenderPackage,
  PlaceableRenderPackageAssetRefs,
  PlaceableApiAssetRole,
  PlaceableApiBlueprintCreatePayload,
  PlaceableApiBlueprintCreateResult,
  PlaceableApiBlueprintDeleteResult,
  PlaceableApiListItem,
  PlaceableApiListQuery,
  PlaceableApiListResult,
  PlaceableApiMetadataPrimitive,
  PlaceableApiProcessBatchResult,
  PlaceableApiProcessPayload,
  PlaceableApiProcessResult,
  PlaceableApiProcessedPayload,
  PlaceableApiPreviewScene,
  PlaceableApiSubtype,
  PlaceableApiViewportRenderPayload,
  PlaceableApiViewportRenderPayloadBatchResult
} from "../contracts";
import type {
  PlaceableApiPort,
  PlaceableApiRequestOptions
} from "../ports/placeableApiPort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class PlaceableApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "PlaceableApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const placeableSubtypeSchema = z.enum([
  "generic",
  "door",
  "vfx",
  "container",
  "light_source",
  "trigger_proxy"
]);

const placeableMetadataPrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);

const placeableListItemSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  placeableSubtype: placeableSubtypeSchema.optional(),
  tags: z.array(z.string()),
  previewImageUrl: z.string(),
  metadata: z.record(placeableMetadataPrimitiveSchema).optional()
});

const placeableListEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(placeableListItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative()
  })
});

const placeableBlueprintDescriptorSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  objectKey: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  etag: z.string().optional(),
  sourceFileType: z.string().min(1),
  sourceFileVersion: z.string().min(1)
});

const placeableBlueprintCreateEnvelopeSchema = z.object({
  data: z.object({
    blueprint: placeableBlueprintDescriptorSchema,
    placeable: placeableListItemSchema.extend({
      kind: z.literal("placeable").optional()
    })
  })
});

const placeableBlueprintDeleteEnvelopeSchema = z.object({
  data: z.object({
    resref: z.string().min(1),
    objectKey: z.string().min(1),
    deleted: z.boolean()
  })
});

const placeableRenderSchema = z.object({
  backendType: placeableSubtypeSchema,
  frontendType: z.enum(["placeable", "door", "vfx"]),
  rendererPreset: z.string().min(1),
  isDoor: z.boolean(),
  isVfx: z.boolean()
});

const placeableRenderPackageAssetRefsSchema = z
  .object({
    modelAssetIds: z.array(z.string().min(1)).optional(),
    derivedModelAssetIds: z.array(z.string().min(1)).optional(),
    chunkModelAssetIds: z.array(z.string().min(1)).optional(),
    textureAssetIds: z.array(z.string().min(1)).optional(),
    materialAssetIds: z.array(z.string().min(1)).optional(),
    metadataAssetIds: z.array(z.string().min(1)).optional(),
    otherAssetIds: z.array(z.string().min(1)).optional()
  })
  .passthrough();

const placeableRenderPackageDiagnosticSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["info", "warn", "error"]),
  message: z.string().min(1)
});

const placeableAuroraEmitterAtlasSchema = z
  .object({
    xGridRaw: z.number().int().nonnegative().optional(),
    yGridRaw: z.number().int().nonnegative().optional(),
    effectiveXGrid: z.number().int().positive(),
    effectiveYGrid: z.number().int().positive(),
    fps: z.number().nonnegative().optional(),
    frameStart: z.number().int().nonnegative().optional(),
    frameEnd: z.number().int().nonnegative().optional(),
    random: z.boolean().optional()
  })
  .passthrough();

const placeableAuroraEmitterSimulationColorSchema = z.tuple([
  z.number(),
  z.number(),
  z.number()
]);

const placeableAuroraEmitterVector3Schema = z.tuple([
  z.number(),
  z.number(),
  z.number()
]);

const placeableAuroraEmitterNumberKeyframeSchema = z
  .object({
    time: z.number().nonnegative(),
    value: z.number()
  })
  .passthrough();

const placeableAuroraEmitterColorKeyframeSchema = z
  .object({
    time: z.number().nonnegative(),
    value: placeableAuroraEmitterSimulationColorSchema
  })
  .passthrough();

const placeableAuroraEmitterVector3KeyframeSchema = z
  .object({
    time: z.number().nonnegative(),
    value: placeableAuroraEmitterVector3Schema
  })
  .passthrough();

const placeableAuroraEmitterOrientationKeyframeSchema = z
  .object({
    time: z.number().nonnegative(),
    value: z.object({
      axis: placeableAuroraEmitterVector3Schema,
      angleRadians: z.number()
    })
  })
  .passthrough();

const placeableAuroraEmitterSimulationTimelineSchema = z
  .object({
    xSize: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    ySize: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    birthrate: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    lifeExp: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    mass: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    velocity: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    randvel: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    spread: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    particleRot: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    bounceCoefficient: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    blastRadius: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    blastLength: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    blurLength: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    detonate: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    fps: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    frameStart: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    frameEnd: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    lightningScale: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    lightningDelay: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    lightningRadius: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    p2pBezier2: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    p2pBezier3: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    combineTime: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    grav: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    drag: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    threshold: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    sizeStart: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    sizeMid: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    sizeEnd: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    sizeStartY: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    sizeMidY: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    sizeEndY: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    percentStart: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    percentMid: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    percentEnd: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    alphaStart: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    alphaMid: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional(),
    alphaEnd: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional()
  })
  .passthrough();

const placeableAuroraEmitterColorTimelineSchema = z
  .object({
    colorStart: z.array(placeableAuroraEmitterColorKeyframeSchema).optional(),
    colorMid: z.array(placeableAuroraEmitterColorKeyframeSchema).optional(),
    colorEnd: z.array(placeableAuroraEmitterColorKeyframeSchema).optional()
  })
  .passthrough();

const placeableAuroraEmitterSimulationSchema = z
  .object({
    xSize: z.number().nonnegative().optional(),
    ySize: z.number().nonnegative().optional(),
    spawnType: z.number().int().nonnegative().optional(),
    // Aurora uses negative controller values as no-spawn/off states (for
    // example plc_t04 has -4 and -15 animation birthrates). Preserve them at
    // the HTTP boundary; the renderer owns the <= 0 spawn gate.
    birthrate: z.number().optional(),
    lifeExp: z.number().nonnegative().optional(),
    mass: z.number().optional(),
    velocity: z.number().optional(),
    randvel: z.number().nonnegative().optional(),
    spread: z.number().nonnegative().optional(),
    particleRot: z.number().optional(),
    bounce: z.boolean().optional(),
    bounceCoefficient: z.number().optional(),
    blastRadius: z.number().nonnegative().optional(),
    blastLength: z.number().nonnegative().optional(),
    blurLength: z.number().nonnegative().optional(),
    detonate: z.number().nonnegative().optional(),
    fps: z.number().nonnegative().optional(),
    frameStart: z.number().nonnegative().optional(),
    frameEnd: z.number().nonnegative().optional(),
    lightningScale: z.number().nonnegative().optional(),
    lightningDelay: z.number().nonnegative().optional(),
    lightningRadius: z.number().nonnegative().optional(),
    deadspace: z.number().optional(),
    p2p: z.boolean().optional(),
    p2pType: z.string().min(1).optional(),
    p2pBezier2: z.number().nonnegative().optional(),
    p2pBezier3: z.number().nonnegative().optional(),
    p2pSource: z.number().nonnegative().optional(),
    p2pTarget: z.number().nonnegative().optional(),
    combineTime: z.number().nonnegative().optional(),
    grav: z.number().optional(),
    drag: z.number().optional(),
    threshold: z.number().nonnegative().optional(),
    inherit: z.boolean().optional(),
    inheritVel: z.boolean().optional(),
    inheritLocal: z.boolean().optional(),
    inheritPart: z.boolean().optional(),
    affectedByWind: z.boolean().optional(),
    sizeStart: z.number().nonnegative().optional(),
    sizeMid: z.number().nonnegative().optional(),
    sizeEnd: z.number().nonnegative().optional(),
    sizeStartY: z.number().nonnegative().optional(),
    sizeMidY: z.number().nonnegative().optional(),
    sizeEndY: z.number().nonnegative().optional(),
    alphaStart: z.number().nonnegative().optional(),
    alphaMid: z.number().nonnegative().optional(),
    alphaEnd: z.number().nonnegative().optional(),
    colorStart: placeableAuroraEmitterSimulationColorSchema.optional(),
    colorMid: placeableAuroraEmitterSimulationColorSchema.optional(),
    colorEnd: placeableAuroraEmitterSimulationColorSchema.optional(),
    percentStart: z.number().nonnegative().optional(),
    percentMid: z.number().nonnegative().optional(),
    percentEnd: z.number().nonnegative().optional(),
    timeline: placeableAuroraEmitterSimulationTimelineSchema.optional(),
    colorTimeline: placeableAuroraEmitterColorTimelineSchema.optional()
  })
  .passthrough();

const placeableAuroraEmitterTransformSchema = z
  .object({
    position: placeableAuroraEmitterVector3Schema.optional(),
    positionTimeline: z.array(placeableAuroraEmitterVector3KeyframeSchema).optional(),
    orientation: z
      .object({
        axis: placeableAuroraEmitterVector3Schema,
        angleRadians: z.number()
      })
      .optional(),
    orientationTimeline: z.array(placeableAuroraEmitterOrientationKeyframeSchema).optional(),
    scale: z.number().optional(),
    scaleTimeline: z.array(placeableAuroraEmitterNumberKeyframeSchema).optional()
  })
  .passthrough();

const placeableAuroraEmitterReferenceNodeSchema = z
  .object({
    nodeName: z.string().min(1),
    parentNodeName: z.string().min(1).optional(),
    transform: placeableAuroraEmitterTransformSchema.optional()
  })
  .passthrough();

const placeableAuroraEmitterAnimationEventSchema = z
  .object({
    time: z.number().nonnegative(),
    type: z.string().min(1),
    animationName: z.string().min(1).optional()
  })
  .passthrough();

const placeableAuroraEmitterAnimationSchema = z
  .object({
    animationName: z.string().min(1),
    lengthSeconds: z.number().nonnegative().optional(),
    transitionSeconds: z.number().nonnegative().optional(),
    simulation: placeableAuroraEmitterSimulationSchema.optional(),
    transform: placeableAuroraEmitterTransformSchema.optional()
  })
  .passthrough();

const placeableAuroraEmitterSourceStateSchema = z
  .object({
    renderOrder: z.number().int().optional(),
    renderHintRaw: z.string().optional(),
    renderHintMode: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
    customShaderVS: z.string().optional(),
    customShaderFS: z.string().optional(),
    customShaderGS: z.string().optional(),
    transparency: z.boolean().optional(),
    twoSidedMaterial: z.boolean().optional(),
    twoSidedTexture: z.boolean().optional(),
    sampleFramebuffer: z.number().int().optional(),
    volumetric: z.boolean().optional(),
    loop: z.boolean().optional(),
    isTinted: z.boolean().optional(),
    splat: z.boolean().optional(),
    rotateTexture: z.boolean().optional()
  })
  .passthrough();

const placeableAuroraEmitterNodeSchema = z
  .object({
    source: z.enum(["aurora-mdl-binary", "aurora-mdl-ascii"]),
    sourceModelAssetId: z.string().min(1),
    sourceModelFileName: z.string().min(1),
    sourceModelObjectKey: z.string().min(1),
    nodeName: z.string().min(1),
    texture: z.string().min(1).optional(),
    chunkName: z.string().min(1).optional(),
    chunkModelAssetId: z.string().min(1).optional(),
    chunkModelFileName: z.string().min(1).optional(),
    chunkModelObjectKey: z.string().min(1).optional(),
    emitterType: z.string().min(1).optional(),
    renderMode: z.string().min(1).optional(),
    blendMode: z.string().min(1).optional(),
    atlas: placeableAuroraEmitterAtlasSchema.optional(),
    simulation: placeableAuroraEmitterSimulationSchema.optional(),
    transform: placeableAuroraEmitterTransformSchema.optional(),
    referenceNodes: z.array(placeableAuroraEmitterReferenceNodeSchema).optional(),
    events: z.array(placeableAuroraEmitterAnimationEventSchema).optional(),
    animations: z.array(placeableAuroraEmitterAnimationSchema).optional(),
    sourceState: placeableAuroraEmitterSourceStateSchema.optional()
  })
  .passthrough();

const placeableAuroraEmitterSchema = z
  .object({
    source: z.literal("source-mdl"),
    emitters: z.array(placeableAuroraEmitterNodeSchema),
    diagnostics: z.array(placeableRenderPackageDiagnosticSchema)
  })
  .passthrough();

const placeableAuroraLightNumberKeyframeSchema = z
  .object({
    time: z.number().nonnegative(),
    value: z.number()
  })
  .passthrough();

const placeableAuroraLightColorKeyframeSchema = z
  .object({
    time: z.number().nonnegative(),
    value: placeableAuroraEmitterSimulationColorSchema
  })
  .passthrough();

const placeableAuroraLightVector3KeyframeSchema = z
  .object({
    time: z.number().nonnegative(),
    value: placeableAuroraEmitterVector3Schema
  })
  .passthrough();

const placeableAuroraLightAnimationSchema = z
  .object({
    animationName: z.string().min(1),
    lengthSeconds: z.number().nonnegative().optional(),
    transitionSeconds: z.number().nonnegative().optional(),
    positionTimeline: z.array(placeableAuroraLightVector3KeyframeSchema).optional(),
    colorTimeline: z.array(placeableAuroraLightColorKeyframeSchema).optional(),
    radiusTimeline: z.array(placeableAuroraLightNumberKeyframeSchema).optional(),
    shadowRadiusTimeline: z.array(placeableAuroraLightNumberKeyframeSchema).optional(),
    verticalDisplacementTimeline: z.array(placeableAuroraLightNumberKeyframeSchema).optional(),
    multiplierTimeline: z.array(placeableAuroraLightNumberKeyframeSchema).optional()
  })
  .passthrough();

const placeableAuroraLightNodeSchema = z
  .object({
    source: z.enum(["aurora-mdl-binary", "aurora-mdl-ascii"]),
    sourceModelAssetId: z.string().min(1),
    sourceModelFileName: z.string().min(1),
    sourceModelObjectKey: z.string().min(1),
    nodeName: z.string().min(1),
    sourceNodeKind: z.string().min(1).optional(),
    parentNodeName: z.string().min(1).optional(),
    transform: placeableAuroraEmitterTransformSchema.optional(),
    radius: z.number().finite().optional(),
    shadowRadius: z.number().finite().optional(),
    verticalDisplacement: z.number().finite().optional(),
    multiplier: z.number().finite().optional(),
    color: placeableAuroraEmitterSimulationColorSchema.optional(),
    ambientOnly: z.boolean().optional(),
    dynamicType: z.number().int().optional(),
    affectDynamic: z.boolean().optional(),
    shadow: z.boolean().optional(),
    lightPriority: z.number().int().optional(),
    generateFlare: z.boolean().optional(),
    textureNames: z.array(z.string().min(1)).optional(),
    flareSizes: z.array(z.number().finite()).optional(),
    flarePositions: z.array(z.number().finite()).optional(),
    flareColorShifts: z.array(placeableAuroraEmitterSimulationColorSchema).optional(),
    flareRadius: z.number().finite().optional(),
    lensFlares: z.boolean().optional(),
    fadingLight: z.boolean().optional(),
    animations: z.array(placeableAuroraLightAnimationSchema).optional()
  })
  .passthrough();

const placeableAuroraLightSchema = z
  .object({
    source: z.literal("source-mdl"),
    lights: z.array(placeableAuroraLightNodeSchema),
    diagnostics: z.array(placeableRenderPackageDiagnosticSchema)
  })
  .passthrough();

const placeableAuroraMaterialStateSchema = z
  .object({
    blending: z.enum(["additive", "punchthrough"]).optional(),
    auroraBlendField48: z.number().int().optional(),
    auroraBlendField4c: z.number().int().optional(),
    decal: z.boolean().optional(),
    transparency: z.boolean().optional(),
    twoSided: z.boolean().optional(),
    renderHint: z.string().min(1).optional(),
    customShaderVS: z.string().min(1).optional(),
    customShaderFS: z.string().min(1).optional(),
    customShaderGS: z.string().min(1).optional(),
    roughness: z.number().optional(),
    specularity: z.number().optional(),
    textureSlots: z
      .array(
        z
          .object({
            slot: z.number().int().nonnegative(),
            role: z.enum([
              "diffuse",
              "normal",
              "specular",
              "roughness",
              "height",
              "emissive",
              "unknown"
            ]),
            reference: z.string().min(1)
          })
          .passthrough()
      )
      .optional()
  })
  .passthrough();

const placeableAuroraMaterialNodeSchema = z
  .object({
    source: z.literal("aurora-mtr"),
    materialAssetId: z.string().min(1),
    materialFileName: z.string().min(1),
    materialObjectKey: z.string().min(1),
    state: placeableAuroraMaterialStateSchema
  })
  .passthrough();

const placeableAuroraMaterialSchema = z
  .object({
    source: z.literal("mtr"),
    materials: z.array(placeableAuroraMaterialNodeSchema),
    diagnostics: z.array(placeableRenderPackageDiagnosticSchema)
  })
  .passthrough();

const placeableRenderPackageTextureBindingSchema = z
  .object({
    reference: z.string().min(1),
    assetId: z.string().min(1),
    fileName: z.string().min(1),
    objectKey: z.string().min(1),
    deliveryUrl: z.string().min(1),
    txi: z
      .object({
        decal: z.boolean().optional(),
        clamp: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
        blending: z.enum(["additive", "punchthrough"]).optional(),
        mipmap: z.boolean().optional(),
        filter: z.boolean().optional(),
        bumpmaptexture: z.string().optional(),
        envmaptexture: z.string().optional(),
        proceduretype: z.string().optional(),
        numx: z.number().optional(),
        numy: z.number().optional(),
        fps: z.number().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

const placeableRenderPackageSchema = z
  .object({
    status: z.enum(["ready", "unsupported", "missing_derived", "missing_assets"]),
    diagnostics: z.array(placeableRenderPackageDiagnosticSchema),
    assetRefs: placeableRenderPackageAssetRefsSchema,
    modelUrl: z.string().min(1).optional(),
    glbUrl: z.string().min(1).optional(),
    textureUrls: z.array(z.string().min(1)).optional(),
    textureBindings: z.array(placeableRenderPackageTextureBindingSchema).optional(),
    auroraEmitter: placeableAuroraEmitterSchema.optional(),
    auroraLight: placeableAuroraLightSchema.optional(),
    auroraMaterial: placeableAuroraMaterialSchema.optional()
  })
  .passthrough();

const placeableAssetEntrySchema = z.object({
  assetId: z.string().min(1),
  role: z.enum(["model", "texture", "material", "vfx", "metadata", "unknown"]),
  fileName: z.string().min(1),
  objectKey: z.string().min(1),
  extension: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  contentType: z.string().min(1),
  etag: z.string().min(1).optional()
});

const placeableAssetManifestSchema = z.object({
  version: z.literal("placeable-asset-manifest/v1"),
  source: z.literal("module-blob-snapshot"),
  generatedAt: z.string().min(1),
  moduleHash: z.string().min(1).optional(),
  assetCount: z.number().int().nonnegative(),
  candidatesScanned: z.number().int().nonnegative(),
  assets: z.array(placeableAssetEntrySchema)
});

const placeableRuntimeProjectionSchema = z
  .object({
    state: z
      .object({
        appearanceType: z.number().optional(),
        animationState: z.number().optional(),
        portraitId: z.number().optional(),
        currentHitPoints: z.number().optional(),
        hardness: z.number().optional(),
        lightState: z.number().optional(),
        lightStateSource: z.string().optional(),
        lightStateProofStatus: z.string().optional(),
        lightStateDefaulted: z.boolean().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

const processedPlaceablePayloadSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  placeableSubtype: placeableSubtypeSchema,
  render: placeableRenderSchema,
  renderPackage: placeableRenderPackageSchema.optional(),
  assetManifest: placeableAssetManifestSchema,
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  placeableRuntime: placeableRuntimeProjectionSchema.optional()
});

const placeablePreviewEnvelopeSchema = z.object({
  data: z.object({
    templateId: z.string().min(1),
    placeableSubtype: placeableSubtypeSchema.optional(),
    resref: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    previewImageUrl: z.string(),
    metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
  })
});

const placeableProcessEnvelopeSchema = z.object({
  data: z.object({
    cache: z.object({
      key: z.string().min(1),
      hit: z.boolean(),
      storedAt: z.string().min(1),
      hits: z.number().int().nonnegative()
    }),
    placeable: processedPlaceablePayloadSchema
  })
});

const placeableProcessBatchEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(placeableProcessEnvelopeSchema.shape.data)
  })
});

const placeableAssetContractsEnvelopeSchema = z.object({
  data: z.object({
    cacheKey: z.string().min(1),
    moduleHash: z.string().min(1).optional(),
    assets: z.array(
      z.object({
        assetId: z.string().min(1),
        objectKey: z.string().min(1),
        contentType: z.string().min(1),
        sizeBytes: z.number().int().nonnegative(),
        deliveryPath: z.string().min(1),
        deliveryUrl: z.string().min(1),
        s3Url: z.string().url().optional()
      })
    )
  })
});

const placeableAssetContractsBatchEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(placeableAssetContractsEnvelopeSchema.shape.data)
  })
});

const placeableViewportRenderPayloadSchema = z.object({
  templateId: z.string().min(1),
  cacheKey: z.string().min(1),
  cacheHit: z.boolean(),
  storedAt: z.string().min(1),
  hits: z.number().int().nonnegative(),
  placeable: processedPlaceablePayloadSchema,
  renderPackage: placeableRenderPackageSchema.optional(),
  assetContracts: placeableAssetContractsEnvelopeSchema.shape.data
});

const placeableViewportRenderPayloadEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(placeableViewportRenderPayloadSchema)
  })
});

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  if (!candidate || candidate.trim().length === 0) {
    return import.meta.env.DEV ? "/_aurora/v1" : "/api/v1";
  }
  return candidate.replace(/\/+$/u, "");
}

function toListQueryString(query?: PlaceableApiListQuery): string {
  if (!query) {
    return "";
  }
  const search = new URLSearchParams();
  if (query.query) {
    search.set("query", query.query);
  }
  if (query.category) {
    search.set("category", query.category);
  }
  if (query.tag) {
    search.set("tag", query.tag);
  }
  if (query.subtype) {
    search.set("subtype", query.subtype);
  }
  if (typeof query.benchmark === "boolean") {
    search.set("benchmark", String(query.benchmark));
  }
  if (typeof query.limit === "number") {
    search.set("limit", String(query.limit));
  }
  if (typeof query.offset === "number") {
    search.set("offset", String(query.offset));
  }
  const value = search.toString();
  return value.length > 0 ? `?${value}` : "";
}

function toAssetContractsQueryString(assetIds?: string[]): string {
  if (!assetIds || assetIds.length === 0) {
    return "";
  }
  const search = new URLSearchParams();
  assetIds.forEach((assetId) => search.append("assetIds", assetId));
  const value = search.toString();
  return value.length > 0 ? `?${value}` : "";
}

async function parseResponseOrThrow(response: Response): Promise<unknown> {
  const payload = await response.json().catch(() => null);
  if (response.ok) {
    return payload;
  }

  const code =
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "code" in payload.error &&
    typeof payload.error.code === "string"
      ? payload.error.code
      : null;

  const message =
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
      ? payload.error.message
      : `Backend request failed with status ${response.status}.`;

  throw new PlaceableApiRequestError(message, response.status, code);
}

function mapListItem(input: z.infer<typeof placeableListItemSchema>): PlaceableApiListItem {
  return {
    templateId: input.templateId,
    resref: input.resref,
    name: input.name,
    category: input.category,
    placeableSubtype: input.placeableSubtype as PlaceableApiSubtype | undefined,
    tags: input.tags,
    previewImageUrl: input.previewImageUrl,
    metadata: input.metadata as Record<string, PlaceableApiMetadataPrimitive> | undefined
  };
}

function mapAssetManifest(
  input: z.infer<typeof placeableAssetManifestSchema>
): PlaceableApiAssetManifest {
  return {
    version: input.version,
    source: input.source,
    generatedAt: input.generatedAt,
    moduleHash: input.moduleHash,
    assetCount: input.assetCount,
    candidatesScanned: input.candidatesScanned,
    assets: input.assets.map((asset) => ({
      assetId: asset.assetId,
      role: asset.role as PlaceableApiAssetRole,
      fileName: asset.fileName,
      objectKey: asset.objectKey,
      extension: asset.extension,
      sizeBytes: asset.sizeBytes,
      contentType: asset.contentType,
      etag: asset.etag
    }))
  };
}

function mapProcessedPayload(
  input: z.infer<typeof processedPlaceablePayloadSchema>
): PlaceableApiProcessedPayload {
  const mappedRenderPackage = input.renderPackage
    ? mapRenderPackage(input.renderPackage)
    : undefined;

  return {
    templateId: input.templateId,
    resref: input.resref,
    name: input.name,
    category: input.category,
    placeableSubtype: input.placeableSubtype,
    renderPackage: mappedRenderPackage,
    render: {
      backendType: input.render.backendType,
      frontendType: input.render.frontendType,
      rendererPreset: input.render.rendererPreset,
      isDoor: input.render.isDoor,
      isVfx: input.render.isVfx
    },
    assetManifest: mapAssetManifest(input.assetManifest),
    metadata: input.metadata,
    placeableRuntime: input.placeableRuntime
      ? {
          state: input.placeableRuntime.state
            ? {
                appearanceType: input.placeableRuntime.state.appearanceType,
                animationState: input.placeableRuntime.state.animationState,
                portraitId: input.placeableRuntime.state.portraitId,
                currentHitPoints: input.placeableRuntime.state.currentHitPoints,
                hardness: input.placeableRuntime.state.hardness,
                lightState: input.placeableRuntime.state.lightState,
                lightStateSource: input.placeableRuntime.state.lightStateSource,
                lightStateProofStatus: input.placeableRuntime.state.lightStateProofStatus,
                lightStateDefaulted: input.placeableRuntime.state.lightStateDefaulted
              }
            : undefined
        }
      : undefined
  };
}

function mapAssetContracts(
  input: z.infer<typeof placeableAssetContractsEnvelopeSchema.shape.data>
): PlaceableApiAssetContractsResult {
  return {
    cacheKey: input.cacheKey,
    moduleHash: input.moduleHash,
    assets: input.assets.map((asset) => ({
      assetId: asset.assetId,
      objectKey: asset.objectKey,
      contentType: asset.contentType,
      sizeBytes: asset.sizeBytes,
      deliveryPath: asset.deliveryPath,
      deliveryUrl: asset.deliveryUrl,
      s3Url: asset.s3Url
    }))
  };
}

function mapViewportRenderPayload(
  input: z.infer<typeof placeableViewportRenderPayloadSchema>
): PlaceableApiViewportRenderPayload {
  return {
    templateId: input.templateId,
    cacheKey: input.cacheKey,
    cacheHit: input.cacheHit,
    storedAt: input.storedAt,
    hits: input.hits,
    placeable: mapProcessedPayload(input.placeable),
    renderPackage: input.renderPackage ? mapRenderPackage(input.renderPackage) : undefined,
    assetContracts: mapAssetContracts(input.assetContracts)
  };
}

function mapRenderPackage(input: z.infer<typeof placeableRenderPackageSchema>): PlaceableRenderPackage {
  return {
    status: input.status,
    diagnostics: input.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message
    })),
    assetRefs: mapRenderPackageAssetRefs(input.assetRefs),
    modelUrl: input.modelUrl,
    glbUrl: input.glbUrl,
    textureUrls: input.textureUrls,
    textureBindings: input.textureBindings?.map((binding) => ({
      reference: binding.reference,
      assetId: binding.assetId,
      fileName: binding.fileName,
      objectKey: binding.objectKey,
      deliveryUrl: binding.deliveryUrl,
      txi: binding.txi
        ? {
            decal: binding.txi.decal,
            clamp: binding.txi.clamp,
            blending: binding.txi.blending,
            mipmap: binding.txi.mipmap,
            filter: binding.txi.filter,
            ...(binding.txi.bumpmaptexture !== undefined
              ? { bumpmaptexture: binding.txi.bumpmaptexture }
              : {}),
            ...(binding.txi.envmaptexture !== undefined
              ? { envmaptexture: binding.txi.envmaptexture }
              : {}),
            ...(binding.txi.proceduretype !== undefined
              ? { proceduretype: binding.txi.proceduretype }
              : {}),
            ...(binding.txi.numx !== undefined ? { numx: binding.txi.numx } : {}),
            ...(binding.txi.numy !== undefined ? { numy: binding.txi.numy } : {}),
            ...(binding.txi.fps !== undefined ? { fps: binding.txi.fps } : {})
          }
        : undefined
    })),
    auroraEmitter: input.auroraEmitter
      ? {
          source: input.auroraEmitter.source,
          emitters: input.auroraEmitter.emitters.map((emitter) => ({
            source: emitter.source,
            sourceModelAssetId: emitter.sourceModelAssetId,
            sourceModelFileName: emitter.sourceModelFileName,
            sourceModelObjectKey: emitter.sourceModelObjectKey,
            nodeName: emitter.nodeName,
            texture: emitter.texture,
            chunkName: emitter.chunkName,
            chunkModelAssetId: emitter.chunkModelAssetId,
            chunkModelFileName: emitter.chunkModelFileName,
            chunkModelObjectKey: emitter.chunkModelObjectKey,
            emitterType: emitter.emitterType,
            renderMode: emitter.renderMode,
            blendMode: emitter.blendMode,
            atlas: emitter.atlas
              ? {
                  xGridRaw: emitter.atlas.xGridRaw,
                  yGridRaw: emitter.atlas.yGridRaw,
                  effectiveXGrid: emitter.atlas.effectiveXGrid,
                  effectiveYGrid: emitter.atlas.effectiveYGrid,
                  fps: emitter.atlas.fps,
                  frameStart: emitter.atlas.frameStart,
                  frameEnd: emitter.atlas.frameEnd,
                  random: emitter.atlas.random
                }
              : undefined,
            simulation: emitter.simulation
              ? {
                  xSize: emitter.simulation.xSize,
                  ySize: emitter.simulation.ySize,
                  spawnType: emitter.simulation.spawnType,
                  birthrate: emitter.simulation.birthrate,
                  lifeExp: emitter.simulation.lifeExp,
                  mass: emitter.simulation.mass,
                  velocity: emitter.simulation.velocity,
                  randvel: emitter.simulation.randvel,
                  spread: emitter.simulation.spread,
                  particleRot: emitter.simulation.particleRot,
                  bounce: emitter.simulation.bounce,
                  bounceCoefficient: emitter.simulation.bounceCoefficient,
                  blastRadius: emitter.simulation.blastRadius,
                  blastLength: emitter.simulation.blastLength,
                  blurLength: emitter.simulation.blurLength,
                  detonate: emitter.simulation.detonate,
                  fps: emitter.simulation.fps,
                  frameStart: emitter.simulation.frameStart,
                  frameEnd: emitter.simulation.frameEnd,
                  lightningScale: emitter.simulation.lightningScale,
                  lightningDelay: emitter.simulation.lightningDelay,
                  lightningRadius: emitter.simulation.lightningRadius,
                  deadspace: emitter.simulation.deadspace,
                  p2p: emitter.simulation.p2p,
                  p2pType: emitter.simulation.p2pType,
                  p2pBezier2: emitter.simulation.p2pBezier2,
                  p2pBezier3: emitter.simulation.p2pBezier3,
                  p2pSource: emitter.simulation.p2pSource,
                  p2pTarget: emitter.simulation.p2pTarget,
                  combineTime: emitter.simulation.combineTime,
                  grav: emitter.simulation.grav,
                  drag: emitter.simulation.drag,
                  threshold: emitter.simulation.threshold,
                  inherit: emitter.simulation.inherit,
                  inheritVel: emitter.simulation.inheritVel,
                  inheritLocal: emitter.simulation.inheritLocal,
                  inheritPart: emitter.simulation.inheritPart,
                  affectedByWind: emitter.simulation.affectedByWind,
                  sizeStart: emitter.simulation.sizeStart,
                  sizeMid: emitter.simulation.sizeMid,
                  sizeEnd: emitter.simulation.sizeEnd,
                  sizeStartY: emitter.simulation.sizeStartY,
                  sizeMidY: emitter.simulation.sizeMidY,
                  sizeEndY: emitter.simulation.sizeEndY,
                  alphaStart: emitter.simulation.alphaStart,
                  alphaMid: emitter.simulation.alphaMid,
                  alphaEnd: emitter.simulation.alphaEnd,
                  colorStart: emitter.simulation.colorStart,
                  colorMid: emitter.simulation.colorMid,
                  colorEnd: emitter.simulation.colorEnd,
                  percentStart: emitter.simulation.percentStart,
                  percentMid: emitter.simulation.percentMid,
                  percentEnd: emitter.simulation.percentEnd,
                  timeline: emitter.simulation.timeline,
                  colorTimeline: emitter.simulation.colorTimeline
                }
              : undefined,
            transform: emitter.transform
              ? {
                  position: emitter.transform.position,
                  ...(emitter.transform.positionTimeline !== undefined
                    ? { positionTimeline: emitter.transform.positionTimeline }
                    : {}),
                  orientation: emitter.transform.orientation
                    ? {
                        axis: emitter.transform.orientation.axis,
                        angleRadians: emitter.transform.orientation.angleRadians
                      }
                    : undefined,
                  ...(emitter.transform.orientationTimeline !== undefined
                    ? { orientationTimeline: emitter.transform.orientationTimeline }
                    : {}),
                  ...(emitter.transform.scale !== undefined
                    ? { scale: emitter.transform.scale }
                    : {}),
                  ...(emitter.transform.scaleTimeline !== undefined
                    ? { scaleTimeline: emitter.transform.scaleTimeline }
                    : {})
                }
              : undefined,
            referenceNodes: emitter.referenceNodes?.map((referenceNode) => ({
              nodeName: referenceNode.nodeName,
              parentNodeName: referenceNode.parentNodeName,
              transform: referenceNode.transform
                ? {
                    position: referenceNode.transform.position,
                      ...(referenceNode.transform.positionTimeline !== undefined
                        ? { positionTimeline: referenceNode.transform.positionTimeline }
                        : {}),
                      orientation: referenceNode.transform.orientation
                        ? {
                            axis: referenceNode.transform.orientation.axis,
                            angleRadians: referenceNode.transform.orientation.angleRadians
                          }
                        : undefined,
                      ...(referenceNode.transform.orientationTimeline !== undefined
                        ? { orientationTimeline: referenceNode.transform.orientationTimeline }
                        : {}),
                      ...(referenceNode.transform.scale !== undefined
                        ? { scale: referenceNode.transform.scale }
                        : {}),
                      ...(referenceNode.transform.scaleTimeline !== undefined
                        ? { scaleTimeline: referenceNode.transform.scaleTimeline }
                        : {})
                    }
                  : undefined
            })),
            events: emitter.events?.map((event) => ({
              time: event.time,
              type: event.type,
              animationName: event.animationName
            })),
            animations: emitter.animations?.map((animation) => ({
              animationName: animation.animationName,
              lengthSeconds: animation.lengthSeconds,
              transitionSeconds: animation.transitionSeconds,
              simulation: animation.simulation
                ? {
                    xSize: animation.simulation.xSize,
                    ySize: animation.simulation.ySize,
                    spawnType: animation.simulation.spawnType,
                    birthrate: animation.simulation.birthrate,
                    lifeExp: animation.simulation.lifeExp,
                    mass: animation.simulation.mass,
                    velocity: animation.simulation.velocity,
                    randvel: animation.simulation.randvel,
                    spread: animation.simulation.spread,
                    particleRot: animation.simulation.particleRot,
                    bounce: animation.simulation.bounce,
                    bounceCoefficient: animation.simulation.bounceCoefficient,
                    blastRadius: animation.simulation.blastRadius,
                    blastLength: animation.simulation.blastLength,
                    blurLength: animation.simulation.blurLength,
                    detonate: animation.simulation.detonate,
                    fps: animation.simulation.fps,
                    frameStart: animation.simulation.frameStart,
                    frameEnd: animation.simulation.frameEnd,
                    lightningScale: animation.simulation.lightningScale,
                    lightningDelay: animation.simulation.lightningDelay,
                    lightningRadius: animation.simulation.lightningRadius,
                    deadspace: animation.simulation.deadspace,
                    p2p: animation.simulation.p2p,
                    p2pType: animation.simulation.p2pType,
                    p2pBezier2: animation.simulation.p2pBezier2,
                    p2pBezier3: animation.simulation.p2pBezier3,
                    p2pSource: animation.simulation.p2pSource,
                    p2pTarget: animation.simulation.p2pTarget,
                    combineTime: animation.simulation.combineTime,
                    grav: animation.simulation.grav,
                    drag: animation.simulation.drag,
                    threshold: animation.simulation.threshold,
                    inherit: animation.simulation.inherit,
                    inheritVel: animation.simulation.inheritVel,
                    inheritLocal: animation.simulation.inheritLocal,
                    inheritPart: animation.simulation.inheritPart,
                    affectedByWind: animation.simulation.affectedByWind,
                    sizeStart: animation.simulation.sizeStart,
                    sizeMid: animation.simulation.sizeMid,
                    sizeEnd: animation.simulation.sizeEnd,
                    sizeStartY: animation.simulation.sizeStartY,
                    sizeMidY: animation.simulation.sizeMidY,
                    sizeEndY: animation.simulation.sizeEndY,
                    alphaStart: animation.simulation.alphaStart,
                    alphaMid: animation.simulation.alphaMid,
                    alphaEnd: animation.simulation.alphaEnd,
                    colorStart: animation.simulation.colorStart,
                    colorMid: animation.simulation.colorMid,
                    colorEnd: animation.simulation.colorEnd,
                    percentStart: animation.simulation.percentStart,
                    percentMid: animation.simulation.percentMid,
                    percentEnd: animation.simulation.percentEnd,
                    timeline: animation.simulation.timeline,
                    colorTimeline: animation.simulation.colorTimeline
                  }
                : undefined,
              transform: animation.transform
                ? {
                    position: animation.transform.position,
                    ...(animation.transform.positionTimeline !== undefined
                      ? { positionTimeline: animation.transform.positionTimeline }
                      : {}),
                    orientation: animation.transform.orientation
                      ? {
                          axis: animation.transform.orientation.axis,
                          angleRadians: animation.transform.orientation.angleRadians
                        }
                      : undefined,
                    ...(animation.transform.orientationTimeline !== undefined
                      ? { orientationTimeline: animation.transform.orientationTimeline }
                      : {}),
                    ...(animation.transform.scale !== undefined
                      ? { scale: animation.transform.scale }
                      : {}),
                    ...(animation.transform.scaleTimeline !== undefined
                      ? { scaleTimeline: animation.transform.scaleTimeline }
                      : {})
                  }
                : undefined
            })),
            sourceState: emitter.sourceState
              ? {
                  renderOrder: emitter.sourceState.renderOrder,
                  renderHintRaw: emitter.sourceState.renderHintRaw,
                  renderHintMode: emitter.sourceState.renderHintMode,
                  customShaderVS: emitter.sourceState.customShaderVS,
                  customShaderFS: emitter.sourceState.customShaderFS,
                  customShaderGS: emitter.sourceState.customShaderGS,
                  transparency: emitter.sourceState.transparency,
                  twoSidedMaterial: emitter.sourceState.twoSidedMaterial,
                  twoSidedTexture: emitter.sourceState.twoSidedTexture,
                  sampleFramebuffer: emitter.sourceState.sampleFramebuffer,
                  volumetric: emitter.sourceState.volumetric,
                  loop: emitter.sourceState.loop,
                  isTinted: emitter.sourceState.isTinted,
                  splat: emitter.sourceState.splat,
                  rotateTexture: emitter.sourceState.rotateTexture
                }
              : undefined
          })),
          diagnostics: input.auroraEmitter.diagnostics.map((diagnostic) => ({
            code: diagnostic.code,
            severity: diagnostic.severity,
            message: diagnostic.message
          }))
        }
      : undefined,
    auroraLight: input.auroraLight
      ? {
          source: input.auroraLight.source,
          lights: input.auroraLight.lights.map((light) => ({
            source: light.source,
            sourceModelAssetId: light.sourceModelAssetId,
            sourceModelFileName: light.sourceModelFileName,
            sourceModelObjectKey: light.sourceModelObjectKey,
            nodeName: light.nodeName,
            sourceNodeKind: light.sourceNodeKind,
            parentNodeName: light.parentNodeName,
            transform: light.transform
              ? {
                  position: light.transform.position,
                  ...(light.transform.positionTimeline !== undefined
                    ? { positionTimeline: light.transform.positionTimeline }
                    : {}),
                  orientation: light.transform.orientation
                    ? {
                        axis: light.transform.orientation.axis,
                        angleRadians: light.transform.orientation.angleRadians
                      }
                    : undefined,
                  ...(light.transform.orientationTimeline !== undefined
                    ? { orientationTimeline: light.transform.orientationTimeline }
                    : {}),
                  ...(light.transform.scale !== undefined ? { scale: light.transform.scale } : {}),
                  ...(light.transform.scaleTimeline !== undefined
                    ? { scaleTimeline: light.transform.scaleTimeline }
                    : {})
                }
              : undefined,
            radius: light.radius,
            shadowRadius: light.shadowRadius,
            verticalDisplacement: light.verticalDisplacement,
            multiplier: light.multiplier,
            color: light.color,
            ambientOnly: light.ambientOnly,
            dynamicType: light.dynamicType,
            affectDynamic: light.affectDynamic,
            shadow: light.shadow,
            lightPriority: light.lightPriority,
            generateFlare: light.generateFlare,
            textureNames: light.textureNames,
            flareSizes: light.flareSizes,
            flarePositions: light.flarePositions,
            flareColorShifts: light.flareColorShifts,
            flareRadius: light.flareRadius,
            lensFlares: light.lensFlares,
            fadingLight: light.fadingLight,
            animations: light.animations?.map((animation) => ({
              animationName: animation.animationName,
              lengthSeconds: animation.lengthSeconds,
              transitionSeconds: animation.transitionSeconds,
              positionTimeline: animation.positionTimeline?.map((frame) => ({
                time: frame.time,
                value: frame.value
              })),
              colorTimeline: animation.colorTimeline?.map((frame) => ({
                time: frame.time,
                value: frame.value
              })),
              radiusTimeline: animation.radiusTimeline?.map((frame) => ({
                time: frame.time,
                value: frame.value
              })),
              shadowRadiusTimeline: animation.shadowRadiusTimeline?.map((frame) => ({
                time: frame.time,
                value: frame.value
              })),
              verticalDisplacementTimeline: animation.verticalDisplacementTimeline?.map(
                (frame) => ({
                  time: frame.time,
                  value: frame.value
                })
              ),
              multiplierTimeline: animation.multiplierTimeline?.map((frame) => ({
                time: frame.time,
                value: frame.value
              }))
            }))
          })),
          diagnostics: input.auroraLight.diagnostics.map((diagnostic) => ({
            code: diagnostic.code,
            severity: diagnostic.severity,
            message: diagnostic.message
          }))
        }
      : undefined,
    auroraMaterial: input.auroraMaterial
      ? {
          source: input.auroraMaterial.source,
          materials: input.auroraMaterial.materials.map((material) => ({
            source: material.source,
            materialAssetId: material.materialAssetId,
            materialFileName: material.materialFileName,
            materialObjectKey: material.materialObjectKey,
            state: {
              blending: material.state.blending,
              auroraBlendField48: material.state.auroraBlendField48,
              auroraBlendField4c: material.state.auroraBlendField4c,
              decal: material.state.decal,
              transparency: material.state.transparency,
              twoSided: material.state.twoSided,
              renderHint: material.state.renderHint,
              customShaderVS: material.state.customShaderVS,
              customShaderFS: material.state.customShaderFS,
              customShaderGS: material.state.customShaderGS,
              roughness: material.state.roughness,
              specularity: material.state.specularity,
              textureSlots: material.state.textureSlots?.map((slot) => ({
                slot: slot.slot,
                role: slot.role,
                reference: slot.reference
              }))
            }
          })),
          diagnostics: input.auroraMaterial.diagnostics.map((diagnostic) => ({
            code: diagnostic.code,
            severity: diagnostic.severity,
            message: diagnostic.message
          }))
        }
      : undefined
  };
}

function mapRenderPackageAssetRefs(
  input: z.infer<typeof placeableRenderPackageAssetRefsSchema>
): PlaceableRenderPackageAssetRefs {
  return {
    modelAssetIds: input.modelAssetIds,
    derivedModelAssetIds: input.derivedModelAssetIds,
    chunkModelAssetIds: input.chunkModelAssetIds,
    textureAssetIds: input.textureAssetIds,
    materialAssetIds: input.materialAssetIds,
    metadataAssetIds: input.metadataAssetIds,
    otherAssetIds: input.otherAssetIds
  };
}

export class HttpPlaceableApiPort implements PlaceableApiPort {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchLike;

  constructor(fetchFn: FetchLike = fetch.bind(globalThis), baseUrl = resolveBaseUrl()) {
    this.fetchFn = fetchFn;
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async listPlaceables(
    accessToken: string,
    query?: PlaceableApiListQuery
  ): Promise<PlaceableApiListResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/placeables${toListQueryString(query)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = placeableListEnvelopeSchema.parse(payload);
    return {
      items: parsed.data.items.map(mapListItem),
      total: parsed.data.total,
      limit: parsed.data.limit,
      offset: parsed.data.offset
    };
  }

  async getPlaceablePreview(
    accessToken: string,
    templateId: string
  ): Promise<PlaceableApiPreviewScene> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/placeables/${encodeURIComponent(templateId)}/preview`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = placeablePreviewEnvelopeSchema.parse(payload);

    return {
      templateId: parsed.data.templateId,
      resref: parsed.data.resref,
      name: parsed.data.name,
      category: parsed.data.category,
      placeableSubtype: parsed.data.placeableSubtype,
      previewImageUrl: parsed.data.previewImageUrl,
      metadata: parsed.data.metadata
    };
  }

  async createPlaceableBlueprint(
    accessToken: string,
    requestPayload: PlaceableApiBlueprintCreatePayload
  ): Promise<PlaceableApiBlueprintCreateResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/placeables/blueprints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload)
    });
    const payload = await parseResponseOrThrow(response);
    const parsed = placeableBlueprintCreateEnvelopeSchema.parse(payload);
    return {
      blueprint: parsed.data.blueprint,
      placeable: {
        ...mapListItem(parsed.data.placeable),
        kind: parsed.data.placeable.kind
      }
    };
  }

  async updatePlaceableBlueprint(
    accessToken: string,
    resRef: string,
    requestPayload: PlaceableApiBlueprintCreatePayload
  ): Promise<PlaceableApiBlueprintCreateResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/placeables/blueprints/${encodeURIComponent(resRef)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestPayload)
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = placeableBlueprintCreateEnvelopeSchema.parse(payload);
    return {
      blueprint: parsed.data.blueprint,
      placeable: {
        ...mapListItem(parsed.data.placeable),
        kind: parsed.data.placeable.kind
      }
    };
  }

  async deletePlaceableBlueprint(
    accessToken: string,
    resRef: string
  ): Promise<PlaceableApiBlueprintDeleteResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/placeables/blueprints/${encodeURIComponent(resRef)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = placeableBlueprintDeleteEnvelopeSchema.parse(payload);
    return parsed.data;
  }

  async processPlaceable(
    accessToken: string,
    requestPayload: PlaceableApiProcessPayload,
    options?: PlaceableApiRequestOptions
  ): Promise<PlaceableApiProcessResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/placeables/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      signal: options?.signal,
      body: JSON.stringify(requestPayload)
    });
    const payload = await parseResponseOrThrow(response);
    const parsed = placeableProcessEnvelopeSchema.parse(payload);

    return {
      cacheKey: parsed.data.cache.key,
      cacheHit: parsed.data.cache.hit,
      storedAt: parsed.data.cache.storedAt,
      hits: parsed.data.cache.hits,
      placeable: mapProcessedPayload(parsed.data.placeable)
    };
  }

  async processPlaceables(
    accessToken: string,
    requestPayloads: PlaceableApiProcessPayload[],
    options?: PlaceableApiRequestOptions
  ): Promise<PlaceableApiProcessBatchResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/placeables/process/batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      signal: options?.signal,
      body: JSON.stringify({ items: requestPayloads })
    });
    const payload = await parseResponseOrThrow(response);
    const parsed = placeableProcessBatchEnvelopeSchema.parse(payload);

    return {
      items: parsed.data.items.map((item) => ({
        cacheKey: item.cache.key,
        cacheHit: item.cache.hit,
        storedAt: item.cache.storedAt,
        hits: item.cache.hits,
        placeable: mapProcessedPayload(item.placeable)
      }))
    };
  }

  async getPlaceableViewportRenderPayloadBatch(
    accessToken: string,
    requestPayloads: PlaceableApiProcessPayload[],
    options?: PlaceableApiRequestOptions
  ): Promise<PlaceableApiViewportRenderPayloadBatchResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/placeables/render-payloads/batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      signal: options?.signal,
      body: JSON.stringify({ items: requestPayloads })
    });
    const payload = await parseResponseOrThrow(response);
    const parsed = placeableViewportRenderPayloadEnvelopeSchema.parse(payload);

    return {
      items: parsed.data.items.map(mapViewportRenderPayload)
    };
  }

  async getPlaceableAssetContracts(
    accessToken: string,
    cacheKey: string,
    assetIds?: string[],
    options?: PlaceableApiRequestOptions
  ): Promise<PlaceableApiAssetContractsResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/placeables/cache/${encodeURIComponent(cacheKey)}/assets/contracts${toAssetContractsQueryString(assetIds)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        signal: options?.signal
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = placeableAssetContractsEnvelopeSchema.parse(payload);
    return mapAssetContracts(parsed.data);
  }

  async getPlaceableAssetContractsBatch(
    accessToken: string,
    items: PlaceableApiAssetContractsBatchRequestItem[],
    options?: PlaceableApiRequestOptions
  ): Promise<PlaceableApiAssetContractsBatchResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/placeables/cache/assets/contracts/batch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        signal: options?.signal,
        body: JSON.stringify({ items })
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = placeableAssetContractsBatchEnvelopeSchema.parse(payload);
    return {
      items: parsed.data.items.map(mapAssetContracts)
    };
  }
}

export function createHttpPlaceableApiPort(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl = resolveBaseUrl()
): PlaceableApiPort {
  return new HttpPlaceableApiPort(fetchFn, baseUrl);
}
