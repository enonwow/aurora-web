import { z } from "zod";
import type {
  CreatureApiBlueprintCreatePayload,
  CreatureApiBlueprintCreateResult,
  CreatureApiBlueprintDeleteResult,
  CreatureApiListItem,
  CreatureApiListQuery,
  CreatureApiListResult,
  CreatureApiMetadataPrimitive,
  CreatureApiProcessPayload,
  CreatureApiProcessResult,
  CreatureApiProcessedPayload,
  CreatureApiResourceOptionKind,
  CreatureApiResourceOptionsResult,
  CreatureRenderPackage
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class CreatureApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "CreatureApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const creatureMetadataPrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);

const creatureListItemSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()),
  previewImageUrl: z.string(),
  metadata: z.record(creatureMetadataPrimitiveSchema).optional()
});

const creatureListEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(creatureListItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative()
  })
});

const creatureRenderSchema = z.object({
  backendType: z.literal("creature"),
  frontendType: z.literal("creature"),
  rendererPreset: z.literal("creature-standard")
});

const creatureRenderPackageDiagnosticSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["info", "warn", "error"]),
  message: z.string().min(1)
});

const creatureRenderAppearanceProfileSchema = z
  .object({
    appearanceType: z.number().optional(),
    appearanceLabel: z.string().optional(),
    appearanceSource2daRow: z.number().optional(),
    appearanceSourceKey: z.string().optional(),
    modelType: z.string().optional(),
    raceModel: z.string().optional(),
    phenotype: z.number().optional(),
    phenotypeLabel: z.string().optional(),
    defaultPhenotype: z.string().optional(),
    raceAppearanceId: z.number().optional(),
    bloodColor: z.string().optional(),
    weaponScale: z.number().optional(),
    sizeCategory: z.number().optional(),
    sizeCategoryLabel: z.string().optional(),
    sizeCategorySource2daRow: z.number().optional(),
    sizeCategorySourceKey: z.string().optional()
  })
  .passthrough();

const creatureNumberRecordSchema = z
  .record(z.number().optional())
  .default({});

const creatureRenderSourceModelCandidateSchema = z.object({
  resref: z.string().min(1),
  role: z.literal("appearance-race-model"),
  source: z.literal("appearance.2da.RACE"),
  confidence: z.enum(["direct-model", "assembly-prefix"]),
  assetId: z.string().optional(),
  modelUrl: z.string().optional(),
  glbUrl: z.string().optional(),
  supermodelResRef: z.string().optional(),
  supermodelAssetId: z.string().optional(),
  supermodelModelUrl: z.string().optional(),
  supermodelGlbUrl: z.string().optional(),
  supermodelChainResRefs: z.array(z.string()).optional(),
  supermodelChainAssetIds: z.array(z.string()).optional(),
  supermodelChainModelUrls: z.array(z.string()).optional(),
  supermodelChainGlbUrls: z.array(z.string()).optional()
});

const creatureRenderSkeletonModelCandidateSchema = z.object({
  resref: z.string().min(1),
  role: z.literal("base-skeleton"),
  source: z.literal("part-model-prefix"),
  modelPrefix: z.string().min(1),
  confidence: z.literal("prefix-derived"),
  assetId: z.string().optional(),
  modelUrl: z.string().optional(),
  glbUrl: z.string().optional(),
  supermodelResRef: z.string().optional(),
  supermodelAssetId: z.string().optional(),
  supermodelModelUrl: z.string().optional(),
  supermodelGlbUrl: z.string().optional(),
  supermodelChainResRefs: z.array(z.string()).optional(),
  supermodelChainAssetIds: z.array(z.string()).optional(),
  supermodelChainModelUrls: z.array(z.string()).optional(),
  supermodelChainGlbUrls: z.array(z.string()).optional()
});

const creatureRenderPartSlotSchema = z.enum([
  "head",
  "wings",
  "tail",
  "rFoot",
  "lFoot",
  "rShin",
  "lShin",
  "lThigh",
  "rThigh",
  "pelvis",
  "torso",
  "belt",
  "neck",
  "rFArm",
  "lFArm",
  "rBicep",
  "lBicep",
  "rShoul",
  "lShoul",
  "rHand",
  "lHand",
  "robe"
]);

const creatureRenderPartModelCandidateSchema = z.object({
  slot: creatureRenderPartSlotSchema,
  partId: z.number().int().nonnegative(),
  partModelName: z.string().min(1),
  nodeName: z.string().optional(),
  modelPrefix: z.string().optional(),
  modelResRef: z.string().optional(),
  modelResRefPattern: z.literal("aurora-player-body-part").optional(),
  modelResRefPatternFormat: z.string().min(1).optional(),
  assetId: z.string().optional(),
  modelUrl: z.string().optional(),
  glbUrl: z.string().optional(),
  source: z.enum([
    "capart.2da.MDLNAME",
    "utc.Appearance_Head",
    "wingmodel.2da.MODEL",
    "tailmodel.2da.MODEL"
  ]),
  source2daRow: z.number().int().nonnegative().optional(),
  sourceKey: z.string().min(1),
  materialColors: creatureNumberRecordSchema.optional()
});

const creatureRenderEquipmentModelPartCandidateSchema = z.object({
  resref: z.string().min(1),
  role: z.string().min(1).optional(),
  partId: z.number().int().optional(),
  assetId: z.string().optional(),
  modelUrl: z.string().optional(),
  glbUrl: z.string().optional(),
  supermodelResRef: z.string().optional(),
  supermodelAssetId: z.string().optional(),
  supermodelModelUrl: z.string().optional(),
  supermodelGlbUrl: z.string().optional(),
  supermodelChainResRefs: z.array(z.string()).optional(),
  supermodelChainAssetIds: z.array(z.string()).optional(),
  supermodelChainModelUrls: z.array(z.string()).optional(),
  supermodelChainGlbUrls: z.array(z.string()).optional()
});

const creatureRenderEquipmentItemPropertySchema = z.object({
  propertyName: z.number().int().optional(),
  propertyLabel: z.string().optional(),
  subtype: z.number().int().optional(),
  costTable: z.number().int().optional(),
  costValue: z.number().int().optional(),
  param1: z.number().int().optional(),
  param1Value: z.number().int().optional(),
  chanceAppear: z.number().int().optional(),
  propertyDefinitionSource2daRow: z.number().int().optional(),
  propertyDefinitionSourceKey: z.string().optional(),
  subTypeTable: z.string().optional(),
  costTableDefinition: z.string().optional(),
  param1Table: z.string().optional(),
  nameStrRef: z.number().int().optional(),
  gameStrRef: z.number().int().optional(),
  descriptionStrRef: z.number().int().optional()
});

const creatureRenderEquipmentModelCandidateSchema = z.object({
  resref: z.string().min(1),
  itemTemplateId: z.string().optional(),
  itemResref: z.string().optional(),
  itemSourceObjectKey: z.string().optional(),
  slotMask: z.number().int().optional(),
  slotLabels: z.array(z.string().min(1)).default([]),
  attachmentTargets: z.array(z.string().min(1)).default([]),
  primaryAttachmentTarget: z.string().optional(),
  baseItem: z.number().int().optional(),
  baseItemEquipableSlots: z.string().optional(),
  weaponWield: z.number().int().optional(),
  weaponType: z.number().int().optional(),
  weaponSize: z.number().int().optional(),
  rangedWeapon: z.number().int().optional(),
  rotateOnGround: z.number().int().optional(),
  ammunitionType: z.number().int().optional(),
  itemName: z.string().optional(),
  itemModelType: z.string().optional(),
  itemModelParts: z.array(z.number().int()).optional(),
  itemModelPartRoles: z.array(z.string().min(1)).optional(),
  itemModelPartResRefs: z.array(z.string().min(1)).optional(),
  itemModelPartCandidates: z.array(creatureRenderEquipmentModelPartCandidateSchema).optional(),
  itemModelPartSourceKey: z.string().optional(),
  itemProperties: z.array(creatureRenderEquipmentItemPropertySchema).optional(),
  source: z.literal("utc.Equip_ItemList"),
  sourceModelStatus: z.enum(["metadata-only", "model-parts-ready", "model-resrefs-ready"])
});

const creatureRenderSourceMdlInspectionNodeSchema = z
  .object({
    name: z.string().min(1),
    nodeType: z.string().min(1),
    parentName: z.string().optional(),
    position: z.tuple([z.number(), z.number(), z.number()]).optional(),
    orientation: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
    orientationFormat: z.enum(["axis-angle", "quaternion"]).optional(),
    scale: z.number().optional()
  })
  .passthrough();

const creatureRenderSourceMdlInspectionAnimationSchema = z
  .object({
    name: z.string().min(1),
    targetModel: z.string().optional(),
    animRoot: z.string().optional(),
    animationScale: z.number().optional(),
    lengthSeconds: z.number(),
    transitionSeconds: z.number(),
    events: z
      .array(
        z.object({
          timeSeconds: z.number(),
          name: z.string().min(1)
        })
      )
      .optional(),
    nodeCount: z.number().int().nonnegative(),
    nodeNames: z.array(z.string()),
    positionKeyCount: z.number().int().nonnegative(),
    orientationKeyCount: z.number().int().nonnegative(),
    scaleKeyCount: z.number().int().nonnegative(),
    alphaKeyCount: z.number().int().nonnegative().optional(),
    danglyNodeCount: z.number().int().nonnegative(),
    animmeshNodeCount: z.number().int().nonnegative()
  })
  .passthrough();

const creatureRenderSourceMdlInspectionSchema = z
  .object({
    source: z.literal("source-mdl"),
    models: z.array(
      z
        .object({
          source: z.enum(["aurora-mdl-binary", "aurora-mdl-ascii"]),
          sourceModelAssetId: z.string().min(1),
          sourceModelFileName: z.string().min(1),
          sourceModelObjectKey: z.string().min(1),
          modelName: z.string().min(1),
          supermodel: z.string().optional(),
          animationScale: z.number().optional(),
          nodeCount: z.number().int().nonnegative(),
          rootNodeNames: z.array(z.string()),
          nodeTypes: z.array(z.string()),
          nodeTypeCounts: z.record(z.number()),
          nodes: z.array(creatureRenderSourceMdlInspectionNodeSchema),
          animationCount: z.number().int().nonnegative(),
          animationNames: z.array(z.string()),
          animations: z.array(creatureRenderSourceMdlInspectionAnimationSchema),
          meshCount: z.number().int().nonnegative(),
          textureReferences: z.array(z.string())
        })
        .passthrough()
    ),
    diagnostics: z.array(creatureRenderPackageDiagnosticSchema)
  })
  .passthrough();

const creatureRenderPackageAssetRefsSchema = z
  .object({
    modelAssetIds: z.array(z.string()).optional(),
    derivedModelAssetIds: z.array(z.string()).optional(),
    chunkModelAssetIds: z.array(z.string()).optional(),
    textureAssetIds: z.array(z.string()).optional(),
    materialAssetIds: z.array(z.string()).optional(),
    metadataAssetIds: z.array(z.string()).optional(),
    otherAssetIds: z.array(z.string()).optional()
  })
  .partial();

const creatureRenderPackageTextureTxiStateSchema = z
  .object({
    decal: z.boolean().optional(),
    clamp: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
    blending: z.enum(["additive", "punchthrough"]).optional(),
    mipmap: z.boolean().optional(),
    filter: z.boolean().optional(),
    bumpmaptexture: z.string().optional(),
    envmaptexture: z.string().optional(),
    proceduretype: z.string().optional(),
    numx: z.number().int().positive().optional(),
    numy: z.number().int().positive().optional(),
    fps: z.number().nonnegative().optional()
  })
  .passthrough();

const creatureRenderPackageTextureBindingSchema = z
  .object({
    reference: z.string().min(1),
    assetId: z.string().min(1),
    fileName: z.string().min(1),
    objectKey: z.string().min(1),
    deliveryUrl: z.string().min(1),
    txi: creatureRenderPackageTextureTxiStateSchema.optional()
  })
  .passthrough();

const creatureAuroraTextureSlotSchema = z
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
  .passthrough();

const creatureAuroraMaterialStateSchema = z
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
    textureSlots: z.array(creatureAuroraTextureSlotSchema).optional()
  })
  .passthrough();

const creatureAuroraMaterialSchema = z
  .object({
    source: z.literal("mtr"),
    materials: z.array(
      z
        .object({
          source: z.literal("aurora-mtr"),
          materialAssetId: z.string().min(1),
          materialFileName: z.string().min(1),
          materialObjectKey: z.string().min(1),
          state: creatureAuroraMaterialStateSchema
        })
        .passthrough()
    ),
    diagnostics: z.array(creatureRenderPackageDiagnosticSchema)
  })
  .passthrough();

const creatureAuroraVector3Schema = z.tuple([z.number(), z.number(), z.number()]);

const creatureAuroraNumberKeyframeSchema = z
  .object({
    time: z.number(),
    value: z.number()
  })
  .passthrough();

const creatureAuroraVector3KeyframeSchema = z
  .object({
    time: z.number(),
    value: creatureAuroraVector3Schema
  })
  .passthrough();

const creatureAuroraOrientationKeyframeSchema = z
  .object({
    time: z.number(),
    value: z.object({
      axis: creatureAuroraVector3Schema,
      angleRadians: z.number()
    })
  })
  .passthrough();

const creatureAuroraEmitterTransformSchema = z
  .object({
    position: creatureAuroraVector3Schema.optional(),
    positionTimeline: z.array(creatureAuroraVector3KeyframeSchema).optional(),
    orientation: z
      .object({
        axis: creatureAuroraVector3Schema,
        angleRadians: z.number()
      })
      .optional(),
    orientationTimeline: z.array(creatureAuroraOrientationKeyframeSchema).optional(),
    scale: z.number().optional(),
    scaleTimeline: z.array(creatureAuroraNumberKeyframeSchema).optional()
  })
  .passthrough();

const creatureAuroraEmitterNodeSchema = z
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
    atlas: z.record(z.string(), z.unknown()).optional(),
    simulation: z.record(z.string(), z.unknown()).optional(),
    transform: creatureAuroraEmitterTransformSchema.optional(),
    referenceNodes: z.array(z.record(z.string(), z.unknown())).optional(),
    events: z.array(z.record(z.string(), z.unknown())).optional(),
    animations: z.array(z.record(z.string(), z.unknown())).optional(),
    sourceState: z.record(z.string(), z.unknown()).optional()
  })
  .passthrough();

const creatureAuroraEmitterSchema = z
  .object({
    source: z.literal("source-mdl"),
    emitters: z.array(creatureAuroraEmitterNodeSchema),
    diagnostics: z.array(creatureRenderPackageDiagnosticSchema)
  })
  .passthrough();

const creatureAuroraLightAnimationSchema = z
  .object({
    animationName: z.string().min(1),
    lengthSeconds: z.number().optional(),
    transitionSeconds: z.number().optional(),
    positionTimeline: z.array(creatureAuroraVector3KeyframeSchema).optional(),
    colorTimeline: z.array(creatureAuroraVector3KeyframeSchema).optional(),
    radiusTimeline: z.array(creatureAuroraNumberKeyframeSchema).optional(),
    shadowRadiusTimeline: z.array(creatureAuroraNumberKeyframeSchema).optional(),
    verticalDisplacementTimeline: z.array(creatureAuroraNumberKeyframeSchema).optional(),
    multiplierTimeline: z.array(creatureAuroraNumberKeyframeSchema).optional()
  })
  .passthrough();

const creatureAuroraLightNodeSchema = z
  .object({
    source: z.enum(["aurora-mdl-binary", "aurora-mdl-ascii"]),
    sourceModelAssetId: z.string().min(1),
    sourceModelFileName: z.string().min(1),
    sourceModelObjectKey: z.string().min(1),
    nodeName: z.string().min(1),
    sourceNodeKind: z.string().min(1).optional(),
    parentNodeName: z.string().optional(),
    transform: creatureAuroraEmitterTransformSchema.optional(),
    radius: z.number().optional(),
    shadowRadius: z.number().optional(),
    verticalDisplacement: z.number().optional(),
    multiplier: z.number().optional(),
    color: creatureAuroraVector3Schema.optional(),
    ambientOnly: z.boolean().optional(),
    dynamicType: z.number().int().optional(),
    affectDynamic: z.boolean().optional(),
    shadow: z.boolean().optional(),
    lightPriority: z.number().int().optional(),
    generateFlare: z.boolean().optional(),
    textureNames: z.array(z.string().min(1)).optional(),
    flareSizes: z.array(z.number()).optional(),
    flarePositions: z.array(z.number()).optional(),
    flareColorShifts: z.array(creatureAuroraVector3Schema).optional(),
    flareRadius: z.number().optional(),
    lensFlares: z.boolean().optional(),
    fadingLight: z.boolean().optional(),
    animations: z.array(creatureAuroraLightAnimationSchema).optional()
  })
  .passthrough();

const creatureAuroraLightSchema = z
  .object({
    source: z.literal("source-mdl"),
    lights: z.array(creatureAuroraLightNodeSchema),
    diagnostics: z.array(creatureRenderPackageDiagnosticSchema)
  })
  .passthrough();

const creatureRenderMaterialPipelineEvidenceSchema = z.object({
  source: z.literal("decompiled-aurora"),
  pltVertexShaderName: z.string().min(1),
  pltFragmentShaderName: z.string().min(1),
  pltSchemeUniformPattern: z.string().min(1),
  pltSchemeUniformCount: z.number().int().positive(),
  pltReplacementUniformName: z.string().min(1),
  skinPaletteResRef: z.string().min(1)
});

const creatureRenderSkeletonPipelineEvidenceSchema = z.object({
  source: z.literal("decompiled-aurora"),
  supermodelCommandName: z.string().min(1),
  animationScaleCommandName: z.string().min(1),
  skinnedMeshNodeType: z.string().min(1),
  requiresComposedSkeleton: z.boolean()
});

const creatureRenderPackageSchema = z.object({
  status: z.enum(["ready", "missing_profile", "missing_derived", "unsupported"]),
  diagnostics: z.array(creatureRenderPackageDiagnosticSchema),
  rendererPreset: z.literal("creature-standard"),
  appearanceProfile: creatureRenderAppearanceProfileSchema.optional(),
  sourceModelCandidates: z.array(creatureRenderSourceModelCandidateSchema).default([]),
  skeletonModelCandidates: z.array(creatureRenderSkeletonModelCandidateSchema).default([]),
  partModelCandidates: z.array(creatureRenderPartModelCandidateSchema).default([]),
  equipmentModelCandidates: z.array(creatureRenderEquipmentModelCandidateSchema).default([]),
  assetRefs: creatureRenderPackageAssetRefsSchema.optional(),
  modelUrl: z.string().optional(),
  glbUrl: z.string().optional(),
  textureUrls: z.array(z.string()).optional(),
  textureBindings: z.array(creatureRenderPackageTextureBindingSchema).optional(),
  auroraEmitter: creatureAuroraEmitterSchema.optional(),
  auroraMaterial: creatureAuroraMaterialSchema.optional(),
  auroraLight: creatureAuroraLightSchema.optional(),
  sourceMdlInspection: creatureRenderSourceMdlInspectionSchema.optional(),
  materialPipelineEvidence: creatureRenderMaterialPipelineEvidenceSchema.optional(),
  skeletonPipelineEvidence: creatureRenderSkeletonPipelineEvidenceSchema.optional(),
  bodyParts: creatureNumberRecordSchema,
  colors: creatureNumberRecordSchema
});

const creatureProcessedPayloadSchema = z.object({
  templateId: z.string().min(1),
  kind: z.literal("creature"),
  resref: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  benchmarkCandidate: z.boolean(),
  benchmarkBucket: z.string().optional(),
  metadata: z.record(creatureMetadataPrimitiveSchema).optional(),
  render: creatureRenderSchema,
  creatureRenderPackage: creatureRenderPackageSchema.optional(),
  creatureRuntime: z.unknown().optional(),
  creatureValidationIssues: z.array(creatureRenderPackageDiagnosticSchema).optional(),
  processedAt: z.string().min(1)
});

const creatureProcessEnvelopeSchema = z.object({
  data: z.object({
    cache: z.object({
      key: z.string().min(1),
      hit: z.boolean(),
      storedAt: z.string().min(1),
      hits: z.number().int().nonnegative()
    }),
    creature: creatureProcessedPayloadSchema
  })
});

const creatureBlueprintDescriptorSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  objectKey: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  etag: z.string().min(1).optional(),
  sourceFileType: z.string().min(1),
  sourceFileVersion: z.string().min(1)
});

const creatureBlueprintCreateEnvelopeSchema = z.object({
  data: z.object({
    blueprint: creatureBlueprintDescriptorSchema,
    cache: creatureProcessEnvelopeSchema.shape.data.shape.cache,
    creature: creatureProcessedPayloadSchema
  })
});

const creatureBlueprintDeleteEnvelopeSchema = z.object({
  data: z.object({
    resref: z.string().min(1),
    objectKey: z.string().min(1),
    deleted: z.boolean()
  })
});

const creatureResourceOptionsEnvelopeSchema = z.object({
  data: z.object({
    kind: z.enum(["conversation", "portrait", "script", "soundset"]),
    items: z.array(
      z.object({
        resRef: z.string().min(1),
        label: z.string().min(1),
        soundSetFile: z.number().int().min(0).max(65535).optional()
      })
    ),
    total: z.number().int().min(0)
  })
});

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  if (!candidate || candidate.trim().length === 0) {
    return import.meta.env.DEV ? "/_aurora/v1" : "/api/v1";
  }
  return candidate.replace(/\/+$/u, "");
}

function appendQueryParam(
  search: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined
): void {
  if (value === undefined) {
    return;
  }
  const normalized = typeof value === "string" ? value.trim() : String(value);
  if (normalized.length === 0) {
    return;
  }
  search.set(key, normalized);
}

function buildListQueryString(query: CreatureApiListQuery | undefined): string {
  if (!query) {
    return "";
  }
  const search = new URLSearchParams();
  appendQueryParam(search, "query", query.query);
  appendQueryParam(search, "category", query.category);
  appendQueryParam(search, "tag", query.tag);
  appendQueryParam(search, "limit", query.limit);
  appendQueryParam(search, "offset", query.offset);
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

  throw new CreatureApiRequestError(message, response.status, code);
}

function mapListItem(input: z.infer<typeof creatureListItemSchema>): CreatureApiListItem {
  return {
    templateId: input.templateId,
    resref: input.resref,
    name: input.name,
    category: input.category,
    tags: input.tags,
    previewImageUrl: input.previewImageUrl,
    metadata: input.metadata as Record<string, CreatureApiMetadataPrimitive> | undefined
  };
}

function mapCreatureRenderPackage(
  input: z.infer<typeof creatureRenderPackageSchema>
): CreatureRenderPackage {
  return {
    status: input.status,
    diagnostics: input.diagnostics,
    rendererPreset: input.rendererPreset,
    appearanceProfile: input.appearanceProfile,
    sourceModelCandidates: input.sourceModelCandidates,
    skeletonModelCandidates: input.skeletonModelCandidates,
    partModelCandidates: input.partModelCandidates,
    equipmentModelCandidates: input.equipmentModelCandidates,
    assetRefs: input.assetRefs,
    modelUrl: input.modelUrl,
    glbUrl: input.glbUrl,
    textureUrls: input.textureUrls,
    textureBindings: input.textureBindings,
    auroraEmitter: input.auroraEmitter as CreatureRenderPackage["auroraEmitter"],
    auroraMaterial: input.auroraMaterial,
    auroraLight: input.auroraLight,
    sourceMdlInspection: input.sourceMdlInspection,
    materialPipelineEvidence: input.materialPipelineEvidence,
    skeletonPipelineEvidence: input.skeletonPipelineEvidence,
    bodyParts: input.bodyParts,
    colors: input.colors
  };
}

function mapProcessedCreaturePayload(
  input: z.infer<typeof creatureProcessedPayloadSchema>
): CreatureApiProcessedPayload {
  return {
    templateId: input.templateId,
    kind: input.kind,
    resref: input.resref,
    name: input.name,
    category: input.category,
    benchmarkCandidate: input.benchmarkCandidate,
    benchmarkBucket: input.benchmarkBucket,
    metadata: input.metadata as Record<string, CreatureApiMetadataPrimitive> | undefined,
    render: input.render,
    creatureRenderPackage: input.creatureRenderPackage
      ? mapCreatureRenderPackage(input.creatureRenderPackage)
      : undefined,
    creatureRuntime: input.creatureRuntime,
    creatureValidationIssues: input.creatureValidationIssues,
    processedAt: input.processedAt
  };
}

function mapProcessEnvelope(
  input: z.infer<typeof creatureProcessEnvelopeSchema>
): CreatureApiProcessResult {
  return {
    cache: input.data.cache,
    creature: mapProcessedCreaturePayload(input.data.creature)
  };
}

function mapBlueprintCreateEnvelope(
  input: z.infer<typeof creatureBlueprintCreateEnvelopeSchema>
): CreatureApiBlueprintCreateResult {
  return {
    blueprint: input.data.blueprint,
    cache: input.data.cache,
    creature: mapProcessedCreaturePayload(input.data.creature)
  };
}

export class HttpCreatureApiPort implements CreatureApiPort {
  private readonly fetchFn: FetchLike;
  private readonly baseUrl: string;

  constructor(
    fetchFn: FetchLike = fetch.bind(globalThis),
    baseUrl: string = resolveBaseUrl()
  ) {
    this.fetchFn = fetchFn;
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async listCreatures(
    accessToken: string,
    query?: CreatureApiListQuery
  ): Promise<CreatureApiListResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/creatures${buildListQueryString(query)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const parsed = creatureListEnvelopeSchema.parse(await parseResponseOrThrow(response));
    return {
      items: parsed.data.items.map(mapListItem),
      total: parsed.data.total,
      limit: parsed.data.limit,
      offset: parsed.data.offset
    };
  }

  async processCreature(
    accessToken: string,
    requestPayload: CreatureApiProcessPayload
  ): Promise<CreatureApiProcessResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/creatures/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload)
    });
    return mapProcessEnvelope(
      creatureProcessEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }

  async listCreatureResourceOptions(
    accessToken: string,
    kind: CreatureApiResourceOptionKind,
    query?: string
  ): Promise<CreatureApiResourceOptionsResult> {
    const search = new URLSearchParams({ kind, limit: "1000" });
    if (query?.trim()) {
      search.set("query", query.trim());
    }
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/creatures/resources?${search.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return creatureResourceOptionsEnvelopeSchema.parse(await parseResponseOrThrow(response)).data;
  }

  async createCreatureBlueprint(
    accessToken: string,
    requestPayload: CreatureApiBlueprintCreatePayload
  ): Promise<CreatureApiBlueprintCreateResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/creatures/blueprints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload)
    });
    return mapBlueprintCreateEnvelope(
      creatureBlueprintCreateEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }

  async updateCreatureBlueprint(
    accessToken: string,
    resRef: string,
    requestPayload: CreatureApiBlueprintCreatePayload
  ): Promise<CreatureApiBlueprintCreateResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/creatures/blueprints/${encodeURIComponent(resRef)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestPayload)
      }
    );
    return mapBlueprintCreateEnvelope(
      creatureBlueprintCreateEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }

  async renameCreatureBlueprint(
    accessToken: string,
    resRef: string,
    nextResRef: string
  ): Promise<CreatureApiBlueprintCreateResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/creatures/blueprints/${encodeURIComponent(resRef)}/rename`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ templateResRef: nextResRef })
      }
    );
    return mapBlueprintCreateEnvelope(
      creatureBlueprintCreateEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }

  async deleteCreatureBlueprint(
    accessToken: string,
    resRef: string
  ): Promise<CreatureApiBlueprintDeleteResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/creatures/blueprints/${encodeURIComponent(resRef)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return creatureBlueprintDeleteEnvelopeSchema.parse(await parseResponseOrThrow(response)).data;
  }

  async getProcessedCreature(
    accessToken: string,
    cacheKey: string
  ): Promise<CreatureApiProcessResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/creatures/cache/${cacheKey}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return mapProcessEnvelope(
      creatureProcessEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }
}

export function createHttpCreatureApiPort(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl: string = resolveBaseUrl()
): CreatureApiPort {
  return new HttpCreatureApiPort(fetchFn, baseUrl);
}
