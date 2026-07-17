export interface AreaApiLoginResult {
  accessToken: string;
}

export interface AreaApiListQuery {
  query?: string;
  biome?: string;
  tag?: string;
  benchmark?: boolean;
  limit?: number;
  offset?: number;
}

export interface AreaApiObjectCounts {
  placeables: number;
  doors: number;
  creatures: number;
  encounters: number;
  items: number;
  sounds: number;
  stores: number;
  triggers: number;
  waypoints: number;
  total: number;
}

export interface AreaApiTileLightColor {
  rowId: number;
  red?: number;
  green?: number;
  blue?: number;
  sourceKey?: string;
}

export interface AreaApiTileLightingEvidence {
  areaId: string;
  areaName: string;
  tileInstanceId: string;
  row: number;
  col: number;
  tileIndex: number;
  tileId?: number;
  tilesetResRef: string;
  modelResRef?: string;
  mainLight1?: number;
  mainLight2?: number;
  sourceLight1?: number;
  sourceLight2?: number;
  mainLight1Color?: AreaApiTileLightColor;
  mainLight2Color?: AreaApiTileLightColor;
  sourceLight1Color?: AreaApiTileLightColor;
  sourceLight2Color?: AreaApiTileLightColor;
  animLoop1?: number;
  animLoop2?: number;
  animLoop3?: number;
}

export type AreaApiGlobalLightingFieldName =
  | "LightingScheme"
  | "ShadowOpacity"
  | "DayNightCycle"
  | "IsNight"
  | "SkyBox"
  | "FogClipDist"
  | "ChanceRain"
  | "ChanceSnow"
  | "ChanceLightning"
  | "WindPower"
  | "SunAmbientColor"
  | "SunDiffuseColor"
  | "SunFogColor"
  | "SunFogAmount"
  | "SunShadows"
  | "MoonAmbientColor"
  | "MoonDiffuseColor"
  | "MoonFogColor"
  | "MoonFogAmount"
  | "MoonShadows";

export interface AreaApiGlobalLightingField {
  field: AreaApiGlobalLightingFieldName;
  value: number;
}

export interface AreaApiGlobalLightingEvidence {
  areaId: string;
  areaName: string;
  source: "are-root-fields";
  fields: AreaApiGlobalLightingField[];
}

export interface AreaApiGlobalLighting {
  source: "are-root-fields";
  fields: AreaApiGlobalLightingField[];
}

export interface AreaApiPlaceableLightingCandidateEvidence {
  areaId: string;
  areaName: string;
  objectId: string;
  templateId: string;
  resRef?: string;
  tag?: string;
  localizedName?: string;
  description?: string;
  appearanceType?: number;
  genericType?: number;
  x: number;
  y: number;
  z: number;
  matchedTokens: string[];
}

export type AreaApiCatalogLightSourceEvidenceKind =
  | "placeables.2da.LightColor"
  | "utp.LightState"
  | "catalog.light_source";

export interface AreaApiCatalogLightSourceEvidence {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  tags: string[];
  evidence: AreaApiCatalogLightSourceEvidenceKind[];
  source2daLightColorRaw?: string;
  source2daLightColorRow?: number;
  source2daLightColorLabel?: string;
  source2daLightColorSourceKey?: string;
  source2daLightRed?: number;
  source2daLightGreen?: number;
  source2daLightBlue?: number;
  source2daToolsetRed?: number;
  source2daToolsetGreen?: number;
  source2daToolsetBlue?: number;
  source2daLightOffsetX?: number;
  source2daLightOffsetY?: number;
  source2daLightOffsetZ?: number;
  source2daShadowSize?: number;
  source2daStatic?: boolean;
  lightState?: number;
  modelResRef?: string;
  lookupModelResRef?: string;
}

export type AreaApiProcessedMdlLightSourceKind = "aurora-mdl-binary" | "aurora-mdl-ascii";

export interface AreaApiProcessedMdlLightVector3 {
  x: number;
  y: number;
  z: number;
}

export interface AreaApiProcessedMdlLightColor {
  red: number;
  green: number;
  blue: number;
}

export interface AreaApiProcessedMdlLightNodeEvidence {
  source: AreaApiProcessedMdlLightSourceKind;
  sourceModelAssetId: string;
  sourceModelFileName: string;
  sourceModelObjectKey: string;
  nodeName: string;
  sourceNodeKind?: string;
  parentNodeName?: string;
  position?: AreaApiProcessedMdlLightVector3;
  scale?: number;
  radius?: number;
  quadraticAtten?: number;
  quadraticAttenSource?: string;
  quadraticAttenProofStatus?: string;
  auroraLightFieldParserSource?: string;
  auroraLightFieldParserProofStatus?: string;
  shadowRadius?: number;
  verticalDisplacement?: number;
  multiplier?: number;
  color?: AreaApiProcessedMdlLightColor;
  ambientOnly?: boolean;
  dynamicType?: number;
  affectDynamic?: boolean;
  shadow?: boolean;
  lightPriority?: number;
  generateFlare?: boolean;
  textureNames?: string[];
  flareSizes?: number[];
  flarePositions?: number[];
  flareColorShifts?: AreaApiProcessedMdlLightColor[];
  flareRadius?: number;
  lensFlares?: boolean;
  fadingLight?: boolean;
  animationNames?: string[];
}

export interface AreaApiProcessedMdlLightSourceEvidence {
  templateId: string;
  resref: string;
  name: string;
  modelResRef?: string;
  lookupModelResRef?: string;
  cacheKey?: string;
  cacheHit?: boolean;
  nodes: AreaApiProcessedMdlLightNodeEvidence[];
}

export type AreaApiRendererLightBudgetCandidateSource =
  | "processed-mdl-light-node"
  | "tile-light-reference"
  | "catalog-light-source-template"
  | "placeable-name-candidate";

export type AreaApiRendererLightBudgetDropReason = "aurora-active-light-slot-cap";

export type AreaApiRendererLightBudgetPriorityStrategy =
  "source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback";

export interface AreaApiRendererLightBudgetCandidateEvidence {
  candidateId: string;
  source: AreaApiRendererLightBudgetCandidateSource;
  label: string;
  priority: number;
  rank: number;
  accepted: boolean;
  dropReason?: AreaApiRendererLightBudgetDropReason;
  areaId?: string;
  areaName?: string;
  tileInstanceId?: string;
  tileChannel?: "mainLight1" | "mainLight2" | "sourceLight1" | "sourceLight2";
  templateId?: string;
  resref?: string;
  nodeName?: string;
  lightPriority?: number;
  retailMdlScoreSource?: string;
  retailMdlScoreProofStatus?: string;
  retailMdlPreviewScore?: number;
  retailMdlPreviewScorePriority?: number;
  retailMdlPreviewScorePreviewDistance?: number;
  retailMdlPreviewScoreRangeTerm?: number;
  retailMdlPreviewScoreFormula?: string;
  retailMdlPreviewScoreSource?: string;
  retailMdlPreviewScoreProofStatus?: string;
  retailMdlPreviewScoreSortDirection?: "ascending-score-field-0x84-preview";
  retailMdlPreviewScoreFallback?: string;
  prioritySource?: string;
}

export interface AreaApiRendererLightBudgetDiagnostic {
  activeLightSlotCap: 128;
  candidateLights: number;
  acceptedLights: number;
  droppedLights: number;
  sampledCandidateLights: number;
  omittedCandidateLights: number;
  priorityStrategy: AreaApiRendererLightBudgetPriorityStrategy;
  priorityStrategyProofStatus:
    "source-backed-mdl-lightmanager-score-diagnostic-cross-lane-fallback";
  retailMdlLightScoreSource: string;
  retailMdlLightSortSource: string;
  retailActiveLightSortScoreSource: string;
  retailActiveLightSortScoreFormula: string;
  retailActiveLightSortDirection: "ascending-score-field-0x84";
  retailActiveLightSortScoreProofStatus:
    "source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked";
  retailActiveLightUploadSource: string;
  retailOrderingStatus: "blocked-no-recovered-retail-cross-lane-active-light-ordering";
  candidates: AreaApiRendererLightBudgetCandidateEvidence[];
}

export type AreaApiShadowDiagnosticEntrySource =
  | "area-root-shadow-field"
  | "processed-mdl-light-node"
  | "catalog-placeable-shadow-size";

export type AreaApiShadowDiagnosticEntrySeverity = "info" | "warning";

export type AreaApiShadowGlobalFieldName = "ShadowOpacity" | "SunShadows" | "MoonShadows";

export interface AreaApiShadowDiagnosticEntry {
  entryId: string;
  source: AreaApiShadowDiagnosticEntrySource;
  label: string;
  severity: AreaApiShadowDiagnosticEntrySeverity;
  note: string;
  areaId?: string;
  areaName?: string;
  field?: AreaApiShadowGlobalFieldName;
  value?: number;
  templateId?: string;
  resref?: string;
  nodeName?: string;
  shadow?: boolean;
  shadowSize?: number;
  rendererRank?: number;
  rendererAccepted?: boolean;
}

export interface AreaApiShadowDiagnostic {
  entries: AreaApiShadowDiagnosticEntry[];
  shadowRelevantEntries: number;
  sampledEntries: number;
  omittedEntries: number;
  globalShadowFields: number;
  areaShadowOpacityFields: number;
  areaSunShadowFields: number;
  areaMoonShadowFields: number;
  mdlShadowLightNodes: number;
  mdlExplicitNonShadowLightNodes: number;
  catalogShadowSizeTemplates: number;
}

export type AreaApiLightingAuditCoverageStatus =
  | "source-backed"
  | "preview-only"
  | "blocked"
  | "not-observed";

export type AreaApiLightingAuditCoverageKey =
  | "area-tile-light-color"
  | "area-tile-light-position"
  | "area-tile-source-light-proxy"
  | "area-tile-light-radius-falloff"
  | "area-global-lighting-fields"
  | "area-global-light-intensity"
  | "area-fog-range"
  | "area-shadow-opacity"
  | "area-shadow-volume-implementation"
  | "placeable-2da-light-color"
  | "placeable-2da-light-offset-shadow"
  | "placeable-lightstate-toggle"
  | "placeable-radius-falloff"
  | "mdl-light-node-radius-color-shadow"
  | "item-property-light-runtime-scheduler"
  | "progfx-type4-runtime-scheduler"
  | "renderer-active-light-budget"
  | "renderer-active-light-ordering";

export interface AreaApiLightingAuditCoverageEntry {
  key: AreaApiLightingAuditCoverageKey;
  label: string;
  status: AreaApiLightingAuditCoverageStatus;
  evidence: string;
  proof: string;
  blocker?: string;
}

export interface AreaApiLightingAuditGapEntry
  extends Omit<AreaApiLightingAuditCoverageEntry, "status"> {
  status: Exclude<AreaApiLightingAuditCoverageStatus, "source-backed">;
  nextStep: string;
}

export type AreaApiLightingRemainingRetailBlockerKey =
  | "retail-shadow-volume-projection-parity"
  | "retail-cross-lane-active-light-ordering"
  | "progfx-type4-priority-proximity-vision-scheduler";

export interface AreaApiLightingRemainingRetailBlocker {
  key: AreaApiLightingRemainingRetailBlockerKey;
  label: string;
  status: "blocked";
  affectedCoverageKeys: AreaApiLightingAuditCoverageKey[];
  evidence: string;
  proof: string;
  requiredEvidence: string;
  oracleCases: AreaApiLightingRetailOracleCase[];
  nextStep: string;
}

export interface AreaApiLightingRetailOracleCase {
  caseId: string;
  purpose: string;
  requiredArtifacts: string[];
  acceptanceGate: string;
  currentStatus: "missing-retail-oracle" | "partial-local-proof";
  currentEvidence: string[];
  blocker: string;
}

export interface AreaApiLightingEvidenceReport {
  summary: {
    areasScanned: number;
    tileLightTiles: number;
    tileLightReferences: number;
    tileLightAreas: number;
    areaGlobalLightingAreas: number;
    areaGlobalLightingFields: number;
    areaShadowOpacityAreas: number;
    placeableNameCandidates: number;
    placeableNameCandidateAreas: number;
    catalogLightSourceTemplates: number;
    catalogLightColorTemplates: number;
    catalogLightStateTemplates: number;
    processedMdlLightTemplatesScanned: number;
    processedMdlLightSourceTemplates: number;
    processedMdlLightNodes: number;
    processedMdlLightScanLimit: number;
    auroraActiveLightSlotCap: 128;
    rendererCandidateLights: number;
    rendererAcceptedLights: number;
    rendererDroppedLights: number;
    shadowDiagnosticEntries: number;
    shadowMdlLightNodes: number;
    shadowCatalogShadowSizeTemplates: number;
    auditCoverageEntries: number;
    auditCoverageSourceBacked: number;
    auditCoveragePreviewOnly: number;
    auditCoverageBlocked: number;
    auditCoverageNotObserved: number;
    auditGaps: number;
    remainingRetailBlockers: number;
  };
  tileLights: AreaApiTileLightingEvidence[];
  areaGlobalLighting: AreaApiGlobalLightingEvidence[];
  placeableNameCandidates: AreaApiPlaceableLightingCandidateEvidence[];
  catalogLightSources: AreaApiCatalogLightSourceEvidence[];
  processedMdlLightSources: AreaApiProcessedMdlLightSourceEvidence[];
  rendererLightBudget: AreaApiRendererLightBudgetDiagnostic;
  shadowDiagnostic: AreaApiShadowDiagnostic;
  auditCoverage: AreaApiLightingAuditCoverageEntry[];
  auditGaps: AreaApiLightingAuditGapEntry[];
  remainingRetailBlockers: AreaApiLightingRemainingRetailBlocker[];
}

export interface AreaApiTileInstance {
  tileInstanceId: string;
  areaId: string;
  tilesetResRef: string;
  row: number;
  col: number;
  tileIndex: number;
  tileId?: number;
  modelResRef?: string;
  modelSource?: "are-tile-list" | "set-tile-section";
  imageMap2D?: string;
  orientation?: number;
  tilesetOrientation?: number;
  mainLight1?: number;
  mainLight2?: number;
  sourceLight1?: number;
  sourceLight2?: number;
  mainLight1Color?: AreaApiTileLightColor;
  mainLight2Color?: AreaApiTileLightColor;
  sourceLight1Color?: AreaApiTileLightColor;
  sourceLight2Color?: AreaApiTileLightColor;
  animLoop1?: number;
  animLoop2?: number;
  animLoop3?: number;
  pathNode?: string;
  visibilityNode?: string;
  visibilityOrientation?: number;
  doorVisibilityNode?: string;
  doorVisibilityOrientation?: number;
  edges?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  cornerHeights?: {
    topLeft?: string;
    topRight?: string;
    bottomLeft?: string;
    bottomRight?: string;
  };
  height?: number;
  source: "are-tile-list";
  fallbackReason?: string;
}

export interface AreaApiTextureAtlas {
  atlasId: string;
  cacheKey: string;
  strategy: "blob-cache";
  objectKey?: string;
  contentType?: string;
  sizeBytes?: number;
  etag?: string;
}

export type AreaApiTextureDeliveryMode = "proxy" | "direct";

export interface AreaApiTextureDeliveryContract {
  mode: AreaApiTextureDeliveryMode;
  atlasId: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  etag?: string;
  proxyPath: string;
  proxyUrl: string;
  directUrl?: string;
  s3Url?: string;
}

export interface AreaApiTextureDeliveryResult {
  cacheKey: string;
  textureAtlas: AreaApiTextureDeliveryContract;
}

export interface AreaApiBinaryExportResult {
  bytes: ArrayBuffer;
  contentType: string;
  sizeBytes: number;
  fileName?: string;
  itemCount?: number;
  objectCount?: number;
  tileCount?: number;
}

export interface AreaApiListItem {
  areaId: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  tags: string[];
  benchmark: boolean;
  previewImageUrl: string;
  textureAtlasId: string;
  objectCounts: AreaApiObjectCounts;
  updatedAt: string;
}

export interface AreaApiListResult {
  items: AreaApiListItem[];
  total: number;
  limit: number;
  offset: number;
}

export type AreaApiObjectKind =
  | "placeable"
  | "door"
  | "creature"
  | "encounter"
  | "item"
  | "sound"
  | "store"
  | "trigger"
  | "waypoint";
export type AreaApiSoundPositioningMode = "everywhere" | "random" | "specific";
export type AreaApiSoundWhenToPlay = "always" | "dayNight" | "hours";
export type AreaApiSoundDayNight = "both" | "day" | "night";
export type AreaApiSoundPlayStyle = "once" | "repeat" | "loop";
export type AreaApiSoundPlayOrder = "sequential" | "random";
export type AreaApiPreservePrimitive = string | number | boolean | null;
export type AreaApiCreatureMetadataPrimitive = string | number | boolean;

export interface AreaApiObjectSoundPositioningPreservePayload {
  timeWindow: string;
  hourMask: string;
  active?: boolean;
  whenToPlay?: AreaApiSoundWhenToPlay;
  dayNight?: AreaApiSoundDayNight;
  hoursStart?: number;
  hoursEnd?: number;
  playStyle?: AreaApiSoundPlayStyle;
  playOrder?: AreaApiSoundPlayOrder;
  intervalMs: number;
  intervalVariationMs: number;
  volume: number;
  volumeVariation: number;
  pitchVariation: number;
  priority: number;
  flags: Record<string, boolean>;
  extra: Record<string, AreaApiPreservePrimitive>;
}

export interface AreaApiObjectSoundPositioning {
  mode: AreaApiSoundPositioningMode;
  elevation: number;
  maxVolumeDistance: number;
  cutoffDistance: number;
  randomRangeWestEast: number;
  randomRangeNorthSouth: number;
  preserve?: AreaApiObjectSoundPositioningPreservePayload;
}

export interface AreaApiObjectDoorTransition {
  linkedTarget: string;
  linkedModule: string;
  linkedTag: string;
  linkedWaypoint: string;
  loadScreen: string;
  flags: Record<string, boolean>;
  extra?: Record<string, AreaApiPreservePrimitive>;
}

export interface AreaApiObjectVisualTransform {
  scale: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  pitch: number;
  yaw: number;
  roll: number;
}

export interface AreaApiObjectPlacement {
  objectId: string;
  kind: AreaApiObjectKind;
  templateId: string;
  resRef?: string;
  tag?: string;
  localizedName?: string;
  description?: string;
  appearanceType?: number;
  genericType?: number;
  isStatic?: boolean;
  creatureMetadata?: Record<string, AreaApiCreatureMetadataPrimitive>;
  itemMetadata?: Record<string, AreaApiCreatureMetadataPrimitive>;
  x: number;
  y: number;
  z: number;
  bearing: number;
  visualTransform?: AreaApiObjectVisualTransform;
  soundPositioning?: AreaApiObjectSoundPositioning;
  doorTransition?: AreaApiObjectDoorTransition;
}

export interface AreaApiDetail {
  areaId: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  tags: string[];
  benchmark: boolean;
  previewImageUrl: string;
  textureAtlas: AreaApiTextureAtlas;
  tileSet?: string;
  tiles?: AreaApiTileInstance[];
  lighting?: AreaApiGlobalLighting;
  composition: AreaApiObjectCounts;
  updatedAt: string;
  objects: AreaApiObjectPlacement[];
}

export interface AreaApiProcessedArea extends AreaApiDetail {
  processedAt: string;
}

export interface AreaApiProcessOptions {
  bypassCache?: boolean;
}

export interface AreaApiProcessingCache {
  key: string;
  hit: boolean;
  storedAt: string;
  hits: number;
}

export interface AreaApiProcessResult {
  cache: AreaApiProcessingCache;
  area: AreaApiProcessedArea;
}
