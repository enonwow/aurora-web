import { z } from "zod";
import type {
  AreaApiBinaryExportResult,
  AreaApiDetail,
  AreaApiLightingEvidenceReport,
  AreaApiListItem,
  AreaApiListQuery,
  AreaApiListResult,
  AreaApiLoginResult,
  AreaApiObjectPlacement,
  AreaApiProcessOptions,
  AreaApiProcessResult,
  AreaApiTextureDeliveryMode,
  AreaApiTextureDeliveryResult
} from "../contracts";
import type { AreaApiPort } from "../ports/areaApiPort";

export class AreaApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "AreaApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const loginEnvelopeSchema = z.object({
  data: z.object({
    session: z.object({
      accessToken: z.string().min(1)
    })
  })
});

const areaObjectCountsSchema = z.object({
  placeables: z.number().int().nonnegative(),
  doors: z.number().int().nonnegative(),
  creatures: z.number().int().nonnegative(),
  encounters: z.number().int().nonnegative().default(0),
  items: z.number().int().nonnegative(),
  sounds: z.number().int().nonnegative(),
  stores: z.number().int().nonnegative().default(0),
  triggers: z.number().int().nonnegative().default(0),
  waypoints: z.number().int().nonnegative().default(0),
  total: z.number().int().nonnegative()
});

const areaTextureAtlasSchema = z.object({
  atlasId: z.string().min(1),
  cacheKey: z.string().min(1),
  strategy: z.literal("blob-cache"),
  objectKey: z.string().optional(),
  contentType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  etag: z.string().optional()
});

const areaTileLightColorSchema = z.object({
  rowId: z.number().int().nonnegative(),
  red: z.number().finite().optional(),
  green: z.number().finite().optional(),
  blue: z.number().finite().optional(),
  sourceKey: z.string().min(1).optional()
});

const areaTileInstanceSchema = z.object({
  tileInstanceId: z.string().min(1),
  areaId: z.string().min(1),
  tilesetResRef: z.string().min(1),
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
  tileIndex: z.number().int().nonnegative(),
  tileId: z.number().int().nonnegative().optional(),
  modelResRef: z.string().min(1).optional(),
  modelSource: z.enum(["are-tile-list", "set-tile-section"]).optional(),
  imageMap2D: z.string().min(1).optional(),
  orientation: z.number().int().min(0).max(3).optional(),
  tilesetOrientation: z.number().int().min(0).max(3).optional(),
  mainLight1: z.number().int().nonnegative().optional(),
  mainLight2: z.number().int().nonnegative().optional(),
  sourceLight1: z.number().int().nonnegative().optional(),
  sourceLight2: z.number().int().nonnegative().optional(),
  mainLight1Color: areaTileLightColorSchema.optional(),
  mainLight2Color: areaTileLightColorSchema.optional(),
  sourceLight1Color: areaTileLightColorSchema.optional(),
  sourceLight2Color: areaTileLightColorSchema.optional(),
  animLoop1: z.number().int().nonnegative().optional(),
  animLoop2: z.number().int().nonnegative().optional(),
  animLoop3: z.number().int().nonnegative().optional(),
  pathNode: z.string().min(1).optional(),
  visibilityNode: z.string().min(1).optional(),
  visibilityOrientation: z.number().int().min(0).max(3).optional(),
  doorVisibilityNode: z.string().min(1).optional(),
  doorVisibilityOrientation: z.number().int().min(0).max(3).optional(),
  edges: z.object({
    top: z.string().min(1).optional(),
    right: z.string().min(1).optional(),
    bottom: z.string().min(1).optional(),
    left: z.string().min(1).optional()
  }).optional(),
  cornerHeights: z.object({
    topLeft: z.string().min(1).optional(),
    topRight: z.string().min(1).optional(),
    bottomLeft: z.string().min(1).optional(),
    bottomRight: z.string().min(1).optional()
  }).optional(),
  height: z.number().finite().optional(),
  source: z.literal("are-tile-list"),
  fallbackReason: z.string().min(1).optional()
});

const areaTileLightingEvidenceSchema = z.object({
  areaId: z.string().min(1),
  areaName: z.string().min(1),
  tileInstanceId: z.string().min(1),
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
  tileIndex: z.number().int().nonnegative(),
  tileId: z.number().int().nonnegative().optional(),
  tilesetResRef: z.string().min(1),
  modelResRef: z.string().min(1).optional(),
  mainLight1: z.number().int().nonnegative().optional(),
  mainLight2: z.number().int().nonnegative().optional(),
  sourceLight1: z.number().int().nonnegative().optional(),
  sourceLight2: z.number().int().nonnegative().optional(),
  mainLight1Color: areaTileLightColorSchema.optional(),
  mainLight2Color: areaTileLightColorSchema.optional(),
  sourceLight1Color: areaTileLightColorSchema.optional(),
  sourceLight2Color: areaTileLightColorSchema.optional(),
  animLoop1: z.number().int().nonnegative().optional(),
  animLoop2: z.number().int().nonnegative().optional(),
  animLoop3: z.number().int().nonnegative().optional()
});

const areaGlobalLightingFieldNameSchema = z.enum([
  "LightingScheme",
  "ShadowOpacity",
  "DayNightCycle",
  "IsNight",
  "SkyBox",
  "FogClipDist",
  "ChanceRain",
  "ChanceSnow",
  "ChanceLightning",
  "WindPower",
  "SunAmbientColor",
  "SunDiffuseColor",
  "SunFogColor",
  "SunFogAmount",
  "SunShadows",
  "MoonAmbientColor",
  "MoonDiffuseColor",
  "MoonFogColor",
  "MoonFogAmount",
  "MoonShadows"
]);

const areaGlobalLightingFieldSchema = z.object({
  field: areaGlobalLightingFieldNameSchema,
  value: z.number().finite()
});

const areaGlobalLightingSchema = z.object({
  source: z.literal("are-root-fields"),
  fields: z.array(areaGlobalLightingFieldSchema)
});

const areaGlobalLightingEvidenceSchema = areaGlobalLightingSchema.extend({
  areaId: z.string().min(1),
  areaName: z.string().min(1)
});

const areaPlaceableLightingCandidateSchema = z.object({
  areaId: z.string().min(1),
  areaName: z.string().min(1),
  objectId: z.string().min(1),
  templateId: z.string().min(1),
  resRef: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  localizedName: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  appearanceType: z.number().finite().optional(),
  genericType: z.number().finite().optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
  matchedTokens: z.array(z.string().min(1))
});

const areaCatalogLightSourceEvidenceKindSchema = z.enum([
  "placeables.2da.LightColor",
  "utp.LightState",
  "catalog.light_source"
]);

const areaCatalogLightSourceEvidenceSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()),
  evidence: z.array(areaCatalogLightSourceEvidenceKindSchema),
  source2daLightColorRaw: z.string().min(1).optional(),
  source2daLightColorRow: z.number().int().nonnegative().optional(),
  source2daLightColorLabel: z.string().min(1).optional(),
  source2daLightColorSourceKey: z.string().min(1).optional(),
  source2daLightRed: z.number().finite().optional(),
  source2daLightGreen: z.number().finite().optional(),
  source2daLightBlue: z.number().finite().optional(),
  source2daToolsetRed: z.number().finite().optional(),
  source2daToolsetGreen: z.number().finite().optional(),
  source2daToolsetBlue: z.number().finite().optional(),
  source2daLightOffsetX: z.number().finite().optional(),
  source2daLightOffsetY: z.number().finite().optional(),
  source2daLightOffsetZ: z.number().finite().optional(),
  source2daShadowSize: z.number().int().nonnegative().optional(),
  source2daStatic: z.boolean().optional(),
  lightState: z.number().int().nonnegative().optional(),
  modelResRef: z.string().min(1).optional(),
  lookupModelResRef: z.string().min(1).optional()
});

const areaProcessedMdlLightVector3Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite()
});

const areaProcessedMdlLightColorSchema = z.object({
  red: z.number().finite(),
  green: z.number().finite(),
  blue: z.number().finite()
});

const areaProcessedMdlLightNodeEvidenceSchema = z.object({
  source: z.enum(["aurora-mdl-binary", "aurora-mdl-ascii"]),
  sourceModelAssetId: z.string().min(1),
  sourceModelFileName: z.string().min(1),
  sourceModelObjectKey: z.string().min(1),
  nodeName: z.string().min(1),
  sourceNodeKind: z.string().min(1).optional(),
  parentNodeName: z.string().min(1).optional(),
  position: areaProcessedMdlLightVector3Schema.optional(),
  scale: z.number().finite().optional(),
  radius: z.number().finite().optional(),
  quadraticAtten: z.number().finite().optional(),
  quadraticAttenSource: z.string().min(1).optional(),
  quadraticAttenProofStatus: z.string().min(1).optional(),
  auroraLightFieldParserSource: z.string().min(1).optional(),
  auroraLightFieldParserProofStatus: z.string().min(1).optional(),
  shadowRadius: z.number().finite().optional(),
  verticalDisplacement: z.number().finite().optional(),
  multiplier: z.number().finite().optional(),
  color: areaProcessedMdlLightColorSchema.optional(),
  ambientOnly: z.boolean().optional(),
  dynamicType: z.number().finite().optional(),
  affectDynamic: z.boolean().optional(),
  shadow: z.boolean().optional(),
  lightPriority: z.number().finite().optional(),
  generateFlare: z.boolean().optional(),
  textureNames: z.array(z.string().min(1)).optional(),
  flareSizes: z.array(z.number().finite()).optional(),
  flarePositions: z.array(z.number().finite()).optional(),
  flareColorShifts: z.array(areaProcessedMdlLightColorSchema).optional(),
  flareRadius: z.number().finite().optional(),
  lensFlares: z.boolean().optional(),
  fadingLight: z.boolean().optional(),
  animationNames: z.array(z.string().min(1)).optional()
});

const areaProcessedMdlLightSourceEvidenceSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  modelResRef: z.string().min(1).optional(),
  lookupModelResRef: z.string().min(1).optional(),
  cacheKey: z.string().min(1).optional(),
  cacheHit: z.boolean().optional(),
  nodes: z.array(areaProcessedMdlLightNodeEvidenceSchema)
});

const areaRendererLightBudgetCandidateSchema = z.object({
  candidateId: z.string().min(1),
  source: z.enum([
    "processed-mdl-light-node",
    "tile-light-reference",
    "catalog-light-source-template",
    "placeable-name-candidate"
  ]),
  label: z.string().min(1),
  priority: z.number().finite(),
  rank: z.number().int().positive(),
  accepted: z.boolean(),
  dropReason: z.literal("aurora-active-light-slot-cap").optional(),
  areaId: z.string().min(1).optional(),
  areaName: z.string().min(1).optional(),
  tileInstanceId: z.string().min(1).optional(),
  tileChannel: z.enum(["mainLight1", "mainLight2", "sourceLight1", "sourceLight2"]).optional(),
  templateId: z.string().min(1).optional(),
  resref: z.string().min(1).optional(),
  nodeName: z.string().min(1).optional(),
  lightPriority: z.number().finite().optional(),
  retailMdlScoreSource: z.string().min(1).optional(),
  retailMdlScoreProofStatus: z.string().min(1).optional(),
  retailMdlPreviewScore: z.number().finite().optional(),
  retailMdlPreviewScorePriority: z.number().finite().optional(),
  retailMdlPreviewScorePreviewDistance: z.number().finite().optional(),
  retailMdlPreviewScoreRangeTerm: z.number().finite().optional(),
  retailMdlPreviewScoreFormula: z.string().min(1).optional(),
  retailMdlPreviewScoreSource: z.string().min(1).optional(),
  retailMdlPreviewScoreProofStatus: z.string().min(1).optional(),
  retailMdlPreviewScoreSortDirection: z.literal("ascending-score-field-0x84-preview").optional(),
  retailMdlPreviewScoreFallback: z.string().min(1).optional(),
  prioritySource: z.string().min(1).optional()
});

const areaRendererLightBudgetSchema = z.object({
  activeLightSlotCap: z.literal(128),
  candidateLights: z.number().int().nonnegative(),
  acceptedLights: z.number().int().nonnegative(),
  droppedLights: z.number().int().nonnegative(),
  sampledCandidateLights: z.number().int().nonnegative(),
  omittedCandidateLights: z.number().int().nonnegative(),
  priorityStrategy: z.literal(
    "source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback"
  ),
  priorityStrategyProofStatus: z.literal(
    "source-backed-mdl-lightmanager-score-diagnostic-cross-lane-fallback"
  ),
  retailMdlLightScoreSource: z.string().min(1),
  retailMdlLightSortSource: z.string().min(1),
  retailActiveLightSortScoreSource: z.string().min(1),
  retailActiveLightSortScoreFormula: z.string().min(1),
  retailActiveLightSortDirection: z.literal("ascending-score-field-0x84"),
  retailActiveLightSortScoreProofStatus: z.literal(
    "source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked"
  ),
  retailActiveLightUploadSource: z.string().min(1),
  retailOrderingStatus: z.literal("blocked-no-recovered-retail-cross-lane-active-light-ordering"),
  candidates: z.array(areaRendererLightBudgetCandidateSchema)
});

const areaShadowDiagnosticEntrySchema = z.object({
  entryId: z.string().min(1),
  source: z.enum([
    "area-root-shadow-field",
    "processed-mdl-light-node",
    "catalog-placeable-shadow-size"
  ]),
  label: z.string().min(1),
  severity: z.enum(["info", "warning"]),
  note: z.string().min(1),
  areaId: z.string().min(1).optional(),
  areaName: z.string().min(1).optional(),
  field: z.enum(["ShadowOpacity", "SunShadows", "MoonShadows"]).optional(),
  value: z.number().finite().optional(),
  templateId: z.string().min(1).optional(),
  resref: z.string().min(1).optional(),
  nodeName: z.string().min(1).optional(),
  shadow: z.boolean().optional(),
  shadowSize: z.number().finite().optional(),
  rendererRank: z.number().int().positive().optional(),
  rendererAccepted: z.boolean().optional()
});

const areaShadowDiagnosticSchema = z.object({
  entries: z.array(areaShadowDiagnosticEntrySchema),
  shadowRelevantEntries: z.number().int().nonnegative(),
  sampledEntries: z.number().int().nonnegative(),
  omittedEntries: z.number().int().nonnegative(),
  globalShadowFields: z.number().int().nonnegative(),
  areaShadowOpacityFields: z.number().int().nonnegative(),
  areaSunShadowFields: z.number().int().nonnegative(),
  areaMoonShadowFields: z.number().int().nonnegative(),
  mdlShadowLightNodes: z.number().int().nonnegative(),
  mdlExplicitNonShadowLightNodes: z.number().int().nonnegative(),
  catalogShadowSizeTemplates: z.number().int().nonnegative()
});

const areaLightingAuditCoverageSchema = z.object({
  key: z.enum([
    "area-tile-light-color",
    "area-tile-light-position",
    "area-tile-source-light-proxy",
    "area-tile-light-radius-falloff",
    "area-global-lighting-fields",
    "area-global-light-intensity",
    "area-fog-range",
    "area-shadow-opacity",
    "area-shadow-volume-implementation",
    "placeable-2da-light-color",
    "placeable-2da-light-offset-shadow",
    "placeable-lightstate-toggle",
    "placeable-radius-falloff",
    "mdl-light-node-radius-color-shadow",
    "item-property-light-runtime-scheduler",
    "progfx-type4-runtime-scheduler",
    "renderer-active-light-budget",
    "renderer-active-light-ordering"
  ]),
  label: z.string().min(1),
  status: z.enum(["source-backed", "preview-only", "blocked", "not-observed"]),
  evidence: z.string().min(1),
  proof: z.string().min(1),
  blocker: z.string().min(1).optional()
});

const areaLightingAuditGapSchema = areaLightingAuditCoverageSchema.extend({
  status: z.enum(["preview-only", "blocked", "not-observed"]),
  nextStep: z.string().min(1)
});

const areaLightingRetailOracleCaseSchema = z.object({
  caseId: z.string().min(1),
  purpose: z.string().min(1),
  requiredArtifacts: z.array(z.string().min(1)).min(1),
  acceptanceGate: z.string().min(1),
  currentStatus: z.enum(["missing-retail-oracle", "partial-local-proof"]),
  currentEvidence: z.array(z.string().min(1)),
  blocker: z.string().min(1)
});

const areaLightingRemainingRetailBlockerSchema = z.object({
  key: z.enum([
    "retail-shadow-volume-projection-parity",
    "retail-cross-lane-active-light-ordering",
    "progfx-type4-priority-proximity-vision-scheduler"
  ]),
  label: z.string().min(1),
  status: z.literal("blocked"),
  affectedCoverageKeys: z.array(areaLightingAuditCoverageSchema.shape.key),
  evidence: z.string().min(1),
  proof: z.string().min(1),
  requiredEvidence: z.string().min(1),
  oracleCases: z.array(areaLightingRetailOracleCaseSchema).min(1),
  nextStep: z.string().min(1)
});

const areaLightingEvidenceEnvelopeSchema = z.object({
  data: z.object({
    summary: z.object({
      areasScanned: z.number().int().nonnegative(),
      tileLightTiles: z.number().int().nonnegative(),
      tileLightReferences: z.number().int().nonnegative(),
      tileLightAreas: z.number().int().nonnegative(),
      areaGlobalLightingAreas: z.number().int().nonnegative(),
      areaGlobalLightingFields: z.number().int().nonnegative(),
      areaShadowOpacityAreas: z.number().int().nonnegative(),
      placeableNameCandidates: z.number().int().nonnegative(),
      placeableNameCandidateAreas: z.number().int().nonnegative(),
      catalogLightSourceTemplates: z.number().int().nonnegative(),
      catalogLightColorTemplates: z.number().int().nonnegative(),
      catalogLightStateTemplates: z.number().int().nonnegative(),
      processedMdlLightTemplatesScanned: z.number().int().nonnegative(),
      processedMdlLightSourceTemplates: z.number().int().nonnegative(),
      processedMdlLightNodes: z.number().int().nonnegative(),
      processedMdlLightScanLimit: z.number().int().nonnegative(),
      auroraActiveLightSlotCap: z.literal(128),
      rendererCandidateLights: z.number().int().nonnegative(),
      rendererAcceptedLights: z.number().int().nonnegative(),
      rendererDroppedLights: z.number().int().nonnegative(),
      shadowDiagnosticEntries: z.number().int().nonnegative(),
      shadowMdlLightNodes: z.number().int().nonnegative(),
      shadowCatalogShadowSizeTemplates: z.number().int().nonnegative(),
      auditCoverageEntries: z.number().int().nonnegative(),
      auditCoverageSourceBacked: z.number().int().nonnegative(),
      auditCoveragePreviewOnly: z.number().int().nonnegative(),
      auditCoverageBlocked: z.number().int().nonnegative(),
      auditCoverageNotObserved: z.number().int().nonnegative(),
      auditGaps: z.number().int().nonnegative().default(0),
      remainingRetailBlockers: z.number().int().nonnegative().default(0)
    }),
    tileLights: z.array(areaTileLightingEvidenceSchema),
    areaGlobalLighting: z.array(areaGlobalLightingEvidenceSchema),
    placeableNameCandidates: z.array(areaPlaceableLightingCandidateSchema),
    catalogLightSources: z.array(areaCatalogLightSourceEvidenceSchema),
    processedMdlLightSources: z.array(areaProcessedMdlLightSourceEvidenceSchema),
    rendererLightBudget: areaRendererLightBudgetSchema,
    shadowDiagnostic: areaShadowDiagnosticSchema,
    auditCoverage: z.array(areaLightingAuditCoverageSchema),
    auditGaps: z.array(areaLightingAuditGapSchema).default([]),
    remainingRetailBlockers: z.array(areaLightingRemainingRetailBlockerSchema).default([])
  })
});

const areaListItemSchema = z.object({
  areaId: z.string().min(1),
  name: z.string().min(1),
  biome: z.string().min(1),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
  tags: z.array(z.string()),
  benchmark: z.boolean(),
  previewImageUrl: z.string(),
  textureAtlasId: z.string().min(1),
  objectCounts: areaObjectCountsSchema,
  updatedAt: z.string().min(1)
});

const areaListEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(areaListItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative()
  })
});

const areaPreservePrimitiveSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null()
]);

const areaCreatureMetadataPrimitiveSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean()
]);

const areaSoundPositioningPreserveSchema = z.object({
  timeWindow: z.string(),
  hourMask: z.string(),
  active: z.boolean().optional(),
  whenToPlay: z.enum(["always", "dayNight", "hours"]).optional(),
  dayNight: z.enum(["both", "day", "night"]).optional(),
  hoursStart: z.number().finite().optional(),
  hoursEnd: z.number().finite().optional(),
  playStyle: z.enum(["once", "repeat", "loop"]).optional(),
  playOrder: z.enum(["sequential", "random"]).optional(),
  intervalMs: z.number().finite().nonnegative(),
  intervalVariationMs: z.number().finite().nonnegative(),
  volume: z.number().finite().nonnegative(),
  volumeVariation: z.number().finite().nonnegative(),
  pitchVariation: z.number().finite().nonnegative(),
  priority: z.number().finite().nonnegative(),
  flags: z.record(z.boolean()),
  extra: z.record(areaPreservePrimitiveSchema)
});

const areaSoundPositioningSchema = z.object({
  mode: z.enum(["everywhere", "random", "specific"]),
  elevation: z.number().finite().nonnegative(),
  maxVolumeDistance: z.number().finite().nonnegative(),
  cutoffDistance: z.number().finite().nonnegative(),
  randomRangeWestEast: z.number().finite().nonnegative(),
  randomRangeNorthSouth: z.number().finite().nonnegative(),
  preserve: areaSoundPositioningPreserveSchema.optional()
});

const areaDoorTransitionSchema = z.object({
  linkedTarget: z.string(),
  linkedModule: z.string(),
  linkedTag: z.string(),
  linkedWaypoint: z.string(),
  loadScreen: z.string(),
  flags: z.record(z.boolean()),
  extra: z.record(areaPreservePrimitiveSchema).optional()
});

const areaObjectVisualTransformSchema = z.object({
  scale: z.number().finite(),
  scaleX: z.number().finite().optional(),
  scaleY: z.number().finite().optional(),
  scaleZ: z.number().finite().optional(),
  offsetX: z.number().finite(),
  offsetY: z.number().finite(),
  offsetZ: z.number().finite(),
  pitch: z.number().finite(),
  yaw: z.number().finite(),
  roll: z.number().finite()
});

const areaObjectSchema = z.object({
  objectId: z.string().min(1),
  kind: z.enum([
    "placeable",
    "door",
    "creature",
    "encounter",
    "item",
    "sound",
    "store",
    "trigger",
    "waypoint"
  ]),
  templateId: z.string().min(1),
  resRef: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  localizedName: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  appearanceType: z.number().finite().optional(),
  genericType: z.number().finite().optional(),
  creatureMetadata: z.record(areaCreatureMetadataPrimitiveSchema).optional(),
  itemMetadata: z.record(areaCreatureMetadataPrimitiveSchema).optional(),
  isStatic: z.boolean().optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
  bearing: z.number().finite(),
  visualTransform: areaObjectVisualTransformSchema.optional(),
  soundPositioning: areaSoundPositioningSchema.optional(),
  doorTransition: areaDoorTransitionSchema.optional()
});

const areaDetailEnvelopeSchema = z.object({
  data: z.object({
    areaId: z.string().min(1),
    name: z.string().min(1),
    biome: z.string().min(1),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
    tags: z.array(z.string()),
    benchmark: z.boolean(),
    previewImageUrl: z.string(),
    textureAtlas: areaTextureAtlasSchema,
    tileSet: z.string().min(1).optional(),
    tiles: z.array(areaTileInstanceSchema).default([]),
    lighting: areaGlobalLightingSchema.optional(),
    composition: areaObjectCountsSchema,
    updatedAt: z.string().min(1),
    objects: z.array(areaObjectSchema)
  })
});

const areaProcessedAreaSchema = areaDetailEnvelopeSchema.shape.data.extend({
  processedAt: z.string().min(1)
});

const areaProcessEnvelopeSchema = z.object({
  data: z.object({
    cache: z.object({
      key: z.string().min(1),
      hit: z.boolean(),
      storedAt: z.string().min(1),
      hits: z.number().int().nonnegative()
    }),
    area: areaProcessedAreaSchema
  })
});

const areaTextureDeliveryContractSchema = z.object({
  mode: z.enum(["proxy", "direct"]),
  atlasId: z.string().min(1),
  objectKey: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  etag: z.string().optional(),
  proxyPath: z.string().min(1),
  proxyUrl: z.string().min(1),
  directUrl: z.string().optional(),
  s3Url: z.string().optional()
});

const areaTextureDeliveryEnvelopeSchema = z.object({
  data: z.object({
    cacheKey: z.string().min(1),
    textureAtlas: areaTextureDeliveryContractSchema
  })
});

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  if (!candidate || candidate.trim().length === 0) {
    return import.meta.env.DEV ? "/_aurora/v1" : "/api/v1";
  }
  return candidate.replace(/\/+$/u, "");
}

function toQueryString(query?: AreaApiListQuery): string {
  if (!query) {
    return "";
  }
  const search = new URLSearchParams();
  if (query.query) {
    search.set("query", query.query);
  }
  if (query.biome) {
    search.set("biome", query.biome);
  }
  if (query.tag) {
    search.set("tag", query.tag);
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

  throw new AreaApiRequestError(message, response.status, code);
}

async function parseBinaryResponseOrThrow(response: Response): Promise<AreaApiBinaryExportResult> {
  if (!response.ok) {
    await parseResponseOrThrow(response);
  }
  const bytes = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const contentLength = Number(response.headers.get("content-length"));
  const itemCount = Number(response.headers.get("x-aurora-area-item-count"));
  const objectCount = Number(response.headers.get("x-aurora-area-object-count"));
  const tileCount = Number(response.headers.get("x-aurora-area-tile-count"));
  return {
    bytes,
    contentType,
    sizeBytes: Number.isFinite(contentLength) ? contentLength : bytes.byteLength,
    fileName: readContentDispositionFileName(response.headers.get("content-disposition")),
    itemCount: Number.isFinite(itemCount) ? itemCount : undefined,
    objectCount: Number.isFinite(objectCount) ? objectCount : undefined,
    tileCount: Number.isFinite(tileCount) ? tileCount : undefined
  };
}

function readContentDispositionFileName(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const match = /filename="([^"]+)"/u.exec(value) ?? /filename=([^;]+)/u.exec(value);
  return match?.[1]?.trim();
}

function mapListItem(input: z.infer<typeof areaListItemSchema>): AreaApiListItem {
  return {
    areaId: input.areaId,
    name: input.name,
    biome: input.biome,
    width: input.width,
    height: input.height,
    tags: input.tags,
    benchmark: input.benchmark,
    previewImageUrl: input.previewImageUrl,
    textureAtlasId: input.textureAtlasId,
    objectCounts: input.objectCounts,
    updatedAt: input.updatedAt
  };
}

function mapAreaObject(
  input: z.infer<typeof areaObjectSchema>
): AreaApiObjectPlacement {
  return {
    objectId: input.objectId,
    kind: input.kind,
    templateId: input.templateId,
    resRef: input.resRef,
    tag: input.tag,
    localizedName: input.localizedName,
    description: input.description,
    appearanceType: input.appearanceType,
    genericType: input.genericType,
    creatureMetadata: input.creatureMetadata ? { ...input.creatureMetadata } : undefined,
    itemMetadata: input.itemMetadata ? { ...input.itemMetadata } : undefined,
    ...(input.isStatic !== undefined ? { isStatic: input.isStatic } : {}),
    x: input.x,
    y: input.y,
    z: input.z,
    bearing: input.bearing,
    visualTransform: input.visualTransform ? { ...input.visualTransform } : undefined,
    soundPositioning: input.soundPositioning,
    doorTransition: input.doorTransition
      ? {
          ...input.doorTransition,
          flags: { ...input.doorTransition.flags },
          ...(input.doorTransition.extra ? { extra: { ...input.doorTransition.extra } } : {})
        }
      : undefined
  };
}

function mapAreaDetail(input: z.infer<typeof areaDetailEnvelopeSchema>["data"]): AreaApiDetail {
  return {
    areaId: input.areaId,
    name: input.name,
    biome: input.biome,
    width: input.width,
    height: input.height,
    tags: input.tags,
    benchmark: input.benchmark,
    previewImageUrl: input.previewImageUrl,
    textureAtlas: input.textureAtlas,
    tileSet: input.tileSet,
    tiles: input.tiles,
    lighting: input.lighting,
    composition: input.composition,
    updatedAt: input.updatedAt,
    objects: input.objects.map(mapAreaObject)
  };
}

export class HttpAreaApiPort implements AreaApiPort {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchLike;

  constructor(fetchFn: FetchLike = fetch.bind(globalThis), baseUrl = resolveBaseUrl()) {
    this.fetchFn = fetchFn;
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async login(username: string, password: string): Promise<AreaApiLoginResult> {
    const response = await this.fetchFn(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });
    const payload = await parseResponseOrThrow(response);
    const parsed = loginEnvelopeSchema.parse(payload);
    return {
      accessToken: parsed.data.session.accessToken
    };
  }

  async listAreas(accessToken: string, query?: AreaApiListQuery): Promise<AreaApiListResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas${toQueryString(query)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = areaListEnvelopeSchema.parse(payload);
    return {
      items: parsed.data.items.map(mapListItem),
      total: parsed.data.total,
      limit: parsed.data.limit,
      offset: parsed.data.offset
    };
  }

  async getAreaLightingEvidence(accessToken: string): Promise<AreaApiLightingEvidenceReport> {
    const response = await this.fetchFn(`${this.baseUrl}/areas/lighting/evidence`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const payload = await parseResponseOrThrow(response);
    const parsed = areaLightingEvidenceEnvelopeSchema.parse(payload);
    return parsed.data;
  }

  async getAreaById(accessToken: string, areaId: string): Promise<AreaApiDetail> {
    const response = await this.fetchFn(`${this.baseUrl}/areas/${encodeURIComponent(areaId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const payload = await parseResponseOrThrow(response);
    const parsed = areaDetailEnvelopeSchema.parse(payload);
    return mapAreaDetail(parsed.data);
  }

  async processArea(
    accessToken: string,
    areaId: string,
    options?: AreaApiProcessOptions
  ): Promise<AreaApiProcessResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas/${encodeURIComponent(areaId)}/process`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bypassCache: options?.bypassCache ?? false })
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = areaProcessEnvelopeSchema.parse(payload);
    return {
      cache: parsed.data.cache,
      area: {
        ...mapAreaDetail(parsed.data.area),
        processedAt: parsed.data.area.processedAt
      }
    };
  }

  async getAreaTextureAtlasContracts(
    accessToken: string,
    cacheKey: string,
    mode: AreaApiTextureDeliveryMode = "proxy"
  ): Promise<AreaApiTextureDeliveryResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas/cache/${encodeURIComponent(cacheKey)}/textures/contracts?mode=${encodeURIComponent(mode)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = areaTextureDeliveryEnvelopeSchema.parse(payload);
    return {
      cacheKey: parsed.data.cacheKey,
      textureAtlas: parsed.data.textureAtlas
    };
  }

  async exportAreaItemsGit(
    accessToken: string,
    areaId: string
  ): Promise<AreaApiBinaryExportResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas/${encodeURIComponent(areaId)}/export/items.git`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return parseBinaryResponseOrThrow(response);
  }

  async exportAreaGit(accessToken: string, areaId: string): Promise<AreaApiBinaryExportResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas/${encodeURIComponent(areaId)}/export/area.git`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return parseBinaryResponseOrThrow(response);
  }

  async exportAreaAre(accessToken: string, areaId: string): Promise<AreaApiBinaryExportResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas/${encodeURIComponent(areaId)}/export/area.are`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return parseBinaryResponseOrThrow(response);
  }
}

export function createHttpAreaApiPort(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl = resolveBaseUrl()
): AreaApiPort {
  return new HttpAreaApiPort(fetchFn, baseUrl);
}
