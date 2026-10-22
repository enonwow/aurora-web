import type {
  AuroraAreaVfxCollisionContract,
  AuroraWorldTimerContract
} from "../scene/contracts";
import type { AreaAdvancedFlags } from "./domain/areaAdvancedFlags";
import type { AreaAudioEnvironment } from "./domain/areaAudioEnvironment";
import type { AreaVisualEnvironment } from "./domain/areaVisualEnvironment";
import type { AreaVisualEnvironmentScalarControls } from "./domain/areaVisualEnvironmentScalarControls";
import type { EffectiveAreaAudioCatalogBundle } from "./domain/effectiveAreaAudioCatalog";
import type { EffectiveAreaLoadingScreenCatalog } from "./domain/effectiveAreaLoadingScreenCatalog";
import type { EffectiveAreaVisualEnvironmentCatalogBundle } from "./domain/effectiveAreaVisualEnvironmentCatalog";
import type { AreaVisualEnvironmentCatalogSelection } from "./domain/areaVisualEnvironmentCatalogSelection";
import type { AreaObjectPolygonGeometry } from "./domain/areaObjectPolygonGeometry";
import type { AreaSoundIntervalVariationStorage } from "./domain/areaSoundIntervalVariationStorage";
import type { AreaSoundVolumeStorage } from "./domain/areaSoundVolumeStorage";
import type { AreaSoundActiveStorage } from "./domain/areaSoundActiveStorage";
import type { AreaSoundPlayOrderStorage } from "./domain/areaSoundPlayOrderStorage";
import type { AreaSoundPlayStyleStorage } from "./domain/areaSoundPlayStyleStorage";
import type { AreaSoundPlaybackStorage } from "./domain/areaSoundPlaybackStorage";
import type { AreaSoundProfileStorage } from "./domain/areaSoundProfileStorage";
import type { AreaSoundScheduleStorage } from "./domain/areaSoundScheduleStorage";
import type { AreaDoorTransitionStorage } from "../shared/domain/areaDoorTransitionStorage";
import type { AreaStoreCommerceValue } from "../scene/domain/storeCommerce";
import type { AreaStoreScriptResRefsValue } from "../scene/domain/storeScriptResRefs";
import type { AreaStoreRestrictionsProvenance } from "../scene/domain/storeRestrictions";
import type { AreaStoreInventoryProvenance } from "../scene/domain/storeInventory";
import type {
  AuroraVariableProvenance,
  AuroraVariableSourceEntry,
  AuroraVariableTargetEntry,
} from "../shared/domain/auroraVariableTable";

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
  sourceAnimationName?: string;
  sourceModelFileName?: string;
  sourceModelHash?: string;
  sourceMultiplier?: number;
  sourceMultiplierSource?: string;
  sourceProofStatus?: string;
  sourceNode?: AreaApiTileSourceLightNode;
  nativeNode?: AreaApiTileNativeLightNode;
}

export type AreaApiTileSourceLightNode =
  | {
      status: "source-node-resolved";
      slotIndex: 1 | 2;
      sourceNodeCount: number;
      name: string;
      position: [number, number, number];
      coordinateSpace: "model-local-aurora-z-up";
      sourceModelFileName: string;
      sourceModelObjectKey: string;
      sourceModelHash: string;
      proofStatus: "source-backed-tile-mdl-source-light-slot-count";
    }
  | {
      status: "source-node-absent-by-aurora-slot-count";
      slotIndex: 1 | 2;
      sourceNodeCount: number;
      sourceModelFileName: string;
      sourceModelObjectKey: string;
      sourceModelHash: string;
      proofStatus: "source-backed-tile-mdl-source-light-slot-count";
    };

export interface AreaApiTileNativeLightNode {
  status: "main-native-node-resolved";
  name: string;
  position: [number, number, number];
  coordinateSpace: "model-local-aurora-z-up";
  radius: number;
  multiplier: number;
  lightPriority?: number;
  ambientOnly?: boolean;
  dynamicType?: number;
  affectDynamic?: boolean;
  shadow?: boolean;
  sourceModelFileName: string;
  sourceModelObjectKey: string;
  sourceModelHash: string;
  proofStatus: "source-backed-tile-mdl-native-main-light";
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

export interface AreaApiStoreMetadata {
  readonly editorComment?: string;
  readonly commerce?: AreaStoreCommerceValue;
  readonly scriptResRefs?: AreaStoreScriptResRefsValue;
  readonly variables?: AuroraVariableProvenance;
  readonly restrictions?: AreaStoreRestrictionsProvenance;
  readonly inventory?: AreaStoreInventoryProvenance;
}

export type AreaApiItemInstanceStateField =
  | "charges"
  | "cost"
  | "stolen"
  | "stackSize"
  | "plot"
  | "addCost"
  | "identified"
  | "cursed";

export interface AreaApiItemInstanceStateValue {
  readonly charges: number;
  readonly cost: number;
  readonly stolen: boolean;
  readonly stackSize: number;
  readonly plot: boolean;
  readonly addCost: number;
  readonly identified: boolean;
  readonly cursed: boolean;
}

export interface AreaApiItemInstanceStateStorage {
  readonly presentFields: readonly AreaApiItemInstanceStateField[];
  readonly values: AreaApiItemInstanceStateValue;
}

export type AreaApiItemTagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

export type AreaApiTriggerTagStorage = AreaApiItemTagStorage;

export type AreaApiEncounterTagStorage = AreaApiItemTagStorage;

export type AreaApiWaypointTagStorage = AreaApiItemTagStorage;

export interface AreaApiEncounterActiveStorage {
  readonly activeByte: 0 | 1;
}

export interface AreaApiEncounterPlayerOnlyStorage {
  readonly playerOnlyByte: 0 | 1;
}

export interface AreaApiEncounterResetStorage {
  readonly resetByte: 0 | 1;
}

export interface AreaApiEncounterResetTimeStorage {
  readonly resetTime: number;
}

export interface AreaApiEncounterSpawnOptionStorage {
  readonly spawnOption: 0 | 1;
}

export interface AreaApiEncounterRespawnsStorage {
  readonly respawns: number;
}

export interface AreaApiEncounterCreatureCountStorage {
  readonly maxCreatures: number;
  readonly recCreatures: number;
}

export interface AreaApiEncounterScriptResRefsStorage {
  readonly onEntered: string;
  readonly onExit: string;
  readonly onExhausted: string;
  readonly onHeartbeat: string;
  readonly onUserDefined: string;
}

export interface AreaApiTriggerScriptResRefsStorage {
  readonly onDisarm: string;
  readonly onTrapTriggered: string;
  readonly onClick: string;
  readonly onHeartbeat: string;
  readonly onEnter: string;
  readonly onExit: string;
  readonly onUserDefined: string;
}

export interface AreaApiTriggerTransitionStorage {
  readonly linkedTo: string;
  readonly linkedToFlags: number;
  readonly loadScreenId: number;
}

export interface AreaApiTriggerCoreProperties {
  readonly autoRemoveKey: 0 | 1;
  readonly factionId: number;
  readonly cursorId: number;
  readonly highlightHeight: number;
  readonly keyName: string;
  readonly portraitId: number;
  readonly triggerType: number;
}

export interface AreaApiTriggerTrapProperties {
  readonly trapDetectable: number;
  readonly trapDetectDc: number;
  readonly trapDisarmable: number;
  readonly disarmDc: number;
  readonly trapFlag: number;
  readonly trapOneShot: number;
  readonly trapType: number;
}

export type AreaApiEncounterFactionStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "dword"; value: number }>;

export type AreaApiEncounterDifficultyIntStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "int"; value: number }>;

export interface AreaApiEncounterDifficultyStorage {
  readonly difficulty: AreaApiEncounterDifficultyIntStorage;
  readonly difficultyIndex: AreaApiEncounterDifficultyIntStorage;
}

export interface AreaApiEncounterCreatureListSourceEntry {
  readonly sourceIndex: number;
  readonly appearance: number;
  readonly challengeRating: number;
  readonly resRef: string;
  readonly singleSpawnByte: 0 | 1;
}

export interface AreaApiEncounterCreatureListProvenance {
  readonly expectedEntries: readonly AreaApiEncounterCreatureListSourceEntry[];
}

export interface AreaApiEncounterSpawnPointSourceEntry {
  readonly sourceIndex: number;
  readonly nativeX: number;
  readonly nativeY: number;
  readonly nativeZ: number;
  readonly orientation: number;
}

export interface AreaApiEncounterSpawnPointListProvenance {
  readonly expectedEntries: readonly AreaApiEncounterSpawnPointSourceEntry[];
}

export type AreaApiItemTemplateResRefStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "resref"; value: string }>;

export type AreaApiWaypointTemplateResRefStorage = AreaApiItemTemplateResRefStorage;
export type AreaApiEncounterTemplateResRefStorage = AreaApiItemTemplateResRefStorage;
export type AreaApiTriggerTemplateResRefStorage = AreaApiItemTemplateResRefStorage;

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
  storage?: AreaDoorTransitionStorage;
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

export type AreaApiPlaceableBasicIdentityTag =
  | { present: false }
  | { present: true; value: string };

export interface AreaApiPlaceableBasicIdentityTable {
  resourceName: "placeables.2da";
  sourceObjectKey: string;
  sourceLayer: "module" | "hak" | "vanilla";
  sha256: string;
  sizeBytes: number;
  rowCount: number;
  rowIndex: number;
}

export type AreaApiPlaceableBasicIdentityAppearance =
  | { present: false }
  | {
      present: true;
      nativeType: "dword";
      value: number;
      table?: AreaApiPlaceableBasicIdentityTable;
    }
  | {
      present: true;
      nativeType: "byte";
      value: number;
    };

export interface AreaApiPlaceableBasicIdentity {
  tag: AreaApiPlaceableBasicIdentityTag;
  appearance: AreaApiPlaceableBasicIdentityAppearance;
}

export type AreaApiCreatureTagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

export type AreaApiCreatureConversationStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

export type AreaApiCreatureInterruptableStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: 0 | 1 }>;

export type AreaApiCreatureBinaryFlagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: 0 | 1 }>;

export interface AreaApiCreatureAdvancedFlagsStorage {
  readonly disarmable: AreaApiCreatureBinaryFlagStorage;
  readonly plot: AreaApiCreatureBinaryFlagStorage;
  readonly immortal: AreaApiCreatureBinaryFlagStorage;
  readonly lootable: AreaApiCreatureBinaryFlagStorage;
  readonly noPermanentDeath: AreaApiCreatureBinaryFlagStorage;
}

export interface AreaApiCreatureAppearanceTable {
  readonly resourceName: "appearance.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
}

export type AreaApiCreatureAppearanceStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "word";
      value: number;
      table?: AreaApiCreatureAppearanceTable;
    }>;

export interface AreaApiCreatureGenderTable {
  readonly resourceName: "gender.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
}

export type AreaApiCreatureGenderStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "byte";
      value: number;
      table?: AreaApiCreatureGenderTable;
    }>;

export interface AreaApiCreaturePerceptionRangeTable {
  readonly resourceName: "ranges.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: 8 | 9 | 10 | 11;
}

export type AreaApiCreaturePerceptionRangeStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "byte";
      value: number;
      table?: AreaApiCreaturePerceptionRangeTable;
    }>;

export interface AreaApiCreatureWalkRateTable {
  readonly resourceName: "creaturespeed.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
  readonly twoDaName: string;
}

export type AreaApiCreatureWalkRateStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "int";
      value: number;
      table?: AreaApiCreatureWalkRateTable;
    }>;

export interface AreaApiCreatureSoundSetFileTable {
  readonly resourceName: "soundset.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
  readonly resRef: string;
}

export type AreaApiCreatureSoundSetFileStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "word";
      value: number;
      table?: AreaApiCreatureSoundSetFileTable;
    }>;

export interface AreaApiCreatureStartingPackageTable {
  readonly resourceName: "packages.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
  readonly classId: number;
}

export type AreaApiCreatureStartingPackageStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "byte";
      value: number;
      classIds?: readonly number[];
      table?: AreaApiCreatureStartingPackageTable;
    }>;

export interface AreaApiCreatureSkillListTable {
  readonly resourceName: "skills.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export type AreaApiCreatureSkillListStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 0;
      rankNativeType: "byte";
      ranks: readonly number[];
      opaqueSiblingFieldCounts: readonly number[];
      table?: AreaApiCreatureSkillListTable;
    }>;

export interface AreaApiCreatureFeatListTable {
  readonly resourceName: "feat.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export type AreaApiCreatureFeatListStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 1;
      featNativeType: "word";
      featIds: readonly number[];
      opaqueSiblingFieldCounts: readonly number[];
      table?: AreaApiCreatureFeatListTable;
    }>;

export interface AreaApiCreatureSpecialAbilityListTable {
  readonly resourceName: "spells.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface AreaApiCreatureSpecialAbilityPhysicalEntry {
  readonly spellId: number;
  readonly spellFlags: number;
  readonly casterLevel: number;
  readonly opaqueSiblingFieldCount: number;
}

export type AreaApiCreatureSpecialAbilityListStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 4;
      entries: readonly AreaApiCreatureSpecialAbilityPhysicalEntry[];
      table?: AreaApiCreatureSpecialAbilityListTable;
    }>;

export interface AreaApiCreatureClassLevelEntry {
  readonly classId: number;
  readonly level: number;
  readonly opaqueSiblingFieldCount: number;
}

export type AreaApiCreatureClassLevelState =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 2;
      classNativeType: "int";
      levelNativeType: "short";
      entries: readonly AreaApiCreatureClassLevelEntry[];
    }>;

export interface AreaApiCreatureClassIdentityEntry {
  readonly classId: number;
  readonly level: number;
  readonly opaqueSiblingFieldCount: number;
  readonly canonicalSpellListFieldCount: number;
  readonly spellEntryCount: number;
  readonly spellLists?: readonly AreaApiCreatureClassSpellListState[];
}

export interface AreaApiCreatureClassSpellEntryState {
  readonly spellId: number;
  readonly spellMetaMagic: number;
  readonly spellFlags: number;
  readonly opaqueSiblingFieldCount: number;
}

export interface AreaApiCreatureClassSpellListState {
  readonly listKind: "known" | "memorized";
  readonly spellLevel: number;
  readonly entries: readonly AreaApiCreatureClassSpellEntryState[];
}

export interface AreaApiCreatureClassesTable {
  readonly resourceName: "classes.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export type AreaApiCreatureClassIdentityState =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 2;
      classNativeType: "int";
      levelNativeType: "short";
      classListGraphSha256: string;
      entries: readonly AreaApiCreatureClassIdentityEntry[];
      classesTable?: AreaApiCreatureClassesTable;
    }>;

export interface AreaApiCreaturePhenotypeTable {
  readonly resourceName: "phenotype.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
}

export type AreaApiCreaturePhenotypeStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "int";
      value: number;
      table?: AreaApiCreaturePhenotypeTable;
    }>;

export interface AreaApiCreaturePortraitSelectorContext {
  readonly genderValue: number;
  readonly raceValue: number;
}

export interface AreaApiCreaturePortraitTable {
  readonly resourceName: "portraits.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
  readonly baseResRef: string;
}

export type AreaApiCreaturePortraitStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "word";
      value: number;
      selectorContext?: AreaApiCreaturePortraitSelectorContext;
      table?: AreaApiCreaturePortraitTable;
    }>;

export type AreaApiCreatureChallengeRatingStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "float";
      value: number;
    }>;

export type AreaApiCreatureAbilityScoreStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type AreaApiCreatureNaturalArmorClassStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type AreaApiCreatureSavingThrowBonusStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "short"; value: number }>;

export interface AreaApiCreatureSavingThrowBonusesStorage {
  readonly fortitude: AreaApiCreatureSavingThrowBonusStorage;
  readonly reflex: AreaApiCreatureSavingThrowBonusStorage;
  readonly will: AreaApiCreatureSavingThrowBonusStorage;
}

export type AreaApiCreatureAlignmentAxisValue = 0 | 50 | 100;

export type AreaApiCreatureAlignmentByteStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "byte";
      value: AreaApiCreatureAlignmentAxisValue;
    }>;

export interface AreaApiCreatureAlignmentStorage {
  readonly goodEvil: AreaApiCreatureAlignmentByteStorage;
  readonly lawfulChaotic: AreaApiCreatureAlignmentByteStorage;
}

export interface AreaApiCreatureAbilityScoresStorage {
  readonly strength: AreaApiCreatureAbilityScoreStorage;
  readonly dexterity: AreaApiCreatureAbilityScoreStorage;
  readonly constitution: AreaApiCreatureAbilityScoreStorage;
  readonly intelligence: AreaApiCreatureAbilityScoreStorage;
  readonly wisdom: AreaApiCreatureAbilityScoreStorage;
  readonly charisma: AreaApiCreatureAbilityScoreStorage;
}

export type AreaApiCreatureAppearanceColorStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export interface AreaApiCreatureAppearanceColorsStorage {
  readonly skin: AreaApiCreatureAppearanceColorStorage;
  readonly hair: AreaApiCreatureAppearanceColorStorage;
  readonly tattoo1: AreaApiCreatureAppearanceColorStorage;
  readonly tattoo2: AreaApiCreatureAppearanceColorStorage;
}

export type AreaApiCreatureBodyPartByteStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type AreaApiCreatureBodyPartWordStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "word"; value: number }>;

export type AreaApiCreatureBodyPartStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      value: number;
      legacyByte: AreaApiCreatureBodyPartByteStorage;
      wideWord: AreaApiCreatureBodyPartWordStorage;
    }>;

export interface AreaApiCreatureBodyPartsStorage {
  readonly rightFoot: AreaApiCreatureBodyPartStorage;
  readonly leftFoot: AreaApiCreatureBodyPartStorage;
  readonly rightShin: AreaApiCreatureBodyPartStorage;
  readonly leftShin: AreaApiCreatureBodyPartStorage;
  readonly leftThigh: AreaApiCreatureBodyPartStorage;
  readonly rightThigh: AreaApiCreatureBodyPartStorage;
  readonly pelvis: AreaApiCreatureBodyPartStorage;
  readonly torso: AreaApiCreatureBodyPartStorage;
  readonly belt: AreaApiCreatureBodyPartStorage;
  readonly neck: AreaApiCreatureBodyPartStorage;
  readonly rightForearm: AreaApiCreatureBodyPartStorage;
  readonly leftForearm: AreaApiCreatureBodyPartStorage;
  readonly rightBicep: AreaApiCreatureBodyPartStorage;
  readonly leftBicep: AreaApiCreatureBodyPartStorage;
  readonly rightShoulder: AreaApiCreatureBodyPartStorage;
  readonly leftShoulder: AreaApiCreatureBodyPartStorage;
  readonly rightHand: AreaApiCreatureBodyPartStorage;
  readonly leftHand: AreaApiCreatureBodyPartStorage;
  readonly head: AreaApiCreatureBodyPartStorage;
}

export interface AreaApiCreatureAppendageTable {
  readonly resourceName: "wingmodel.2da" | "tailmodel.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
}

export type AreaApiCreatureAppendageDwordStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "dword";
      value: number;
      table?: AreaApiCreatureAppendageTable;
    }>;

export type AreaApiCreatureAppendageByteStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type AreaApiCreatureAppendageStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      value: number;
      modernDword: AreaApiCreatureAppendageDwordStorage;
      legacyByte: AreaApiCreatureAppendageByteStorage;
    }>;

export interface AreaApiCreatureAppendagesStorage {
  readonly wings: AreaApiCreatureAppendageStorage;
  readonly tail: AreaApiCreatureAppendageStorage;
}

export interface AreaApiCreatureHitPointRacialTypesBinding {
  readonly resourceName: "racialtypes.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
  readonly constitutionAdjust: number;
}

export type AreaApiCreatureHitPointState =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      hitPoints: Readonly<{ nativeType: "short"; value: number }>;
      currentHitPoints: Readonly<{ nativeType: "short"; value: number }>;
      maxHitPoints: Readonly<{ nativeType: "short"; value: number }>;
      constitution: Readonly<{ nativeType: "byte"; value: number }>;
      race: Readonly<{ nativeType: "byte"; value: number }>;
      classLevels: readonly number[];
      featRow40Present: boolean;
      racialTypes?: AreaApiCreatureHitPointRacialTypesBinding;
    }>;

export type AreaApiCreatureFactionStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "word"; value: number }>;

export type AreaApiCreatureTemplateResRefStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "resref"; value: string }>;

export type AreaApiCreatureSpecialIdentityStringStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "cexostring"; value: string }>;

export interface AreaApiCreatureSpecialIdentityStringsStorage {
  readonly subrace: AreaApiCreatureSpecialIdentityStringStorage;
  readonly deity: AreaApiCreatureSpecialIdentityStringStorage;
}

export type AreaApiCreatureScriptResRefStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "resref"; value: string }>;

export interface AreaApiCreatureScriptResRefsStorage {
  readonly onHeartbeat: AreaApiCreatureScriptResRefStorage;
  readonly onPerception: AreaApiCreatureScriptResRefStorage;
  readonly onSpellCastAt: AreaApiCreatureScriptResRefStorage;
  readonly onPhysicalAttacked: AreaApiCreatureScriptResRefStorage;
  readonly onDamaged: AreaApiCreatureScriptResRefStorage;
  readonly onDisturbed: AreaApiCreatureScriptResRefStorage;
  readonly onCombatRoundEnd: AreaApiCreatureScriptResRefStorage;
  readonly onConversation: AreaApiCreatureScriptResRefStorage;
  readonly onSpawn: AreaApiCreatureScriptResRefStorage;
  readonly onRested: AreaApiCreatureScriptResRefStorage;
  readonly onDeath: AreaApiCreatureScriptResRefStorage;
  readonly onUserDefined: AreaApiCreatureScriptResRefStorage;
  readonly onBlocked: AreaApiCreatureScriptResRefStorage;
}

export type AreaApiPlaceableTrapTypeStorage =
  | { present: false }
  | { present: true; nativeType: "byte"; value: number };

export interface AreaApiPlaceableTrapTypeTableDescriptor {
  resourceName: "traps.2da";
  sourceObjectKey: string;
  sourceLayer: "module" | "hak" | "vanilla";
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}

export interface AreaApiPlaceableTrapTypeRow {
  rowIndex: number;
  label?: string;
  trapNameStrRef?: number;
  setDc: number;
  detectDcMod: number;
  disarmDcMod: number;
  displayName: string;
  displaySource: "strref" | "label" | "row_index";
}

export interface AreaApiPlaceableTrapTypeCatalog {
  descriptor: AreaApiPlaceableTrapTypeTableDescriptor;
  rows: AreaApiPlaceableTrapTypeRow[];
}

export type AreaApiPlaceableBodyBagStorage =
  | { present: false }
  | { present: true; nativeType: "byte"; value: number };

export type AreaApiCreatureBodyBagStorage = AreaApiPlaceableBodyBagStorage;

export type AreaApiCreatureDecayTimeStorage =
  | { present: false }
  | { present: true; nativeType: "dword"; valueMilliseconds: number };

export interface AreaApiPlaceableBodyBagTableDescriptor {
  resourceName: "bodybag.2da";
  sourceObjectKey: string;
  sourceLayer: "module" | "hak" | "vanilla";
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}

export interface AreaApiPlaceableBodyBagRow {
  rowIndex: number;
  label?: string;
  nameStrRef: number;
  displayName: string;
  displaySource: "strref" | "label" | "row_index";
}

export interface AreaApiPlaceableBodyBagCatalog {
  descriptor: AreaApiPlaceableBodyBagTableDescriptor;
  rows: AreaApiPlaceableBodyBagRow[];
}

export type AreaApiPlaceablePortraitIdStorage =
  | { present: false }
  | { present: true; nativeType: "word"; value: number };

export interface AreaApiPlaceablePortraitTableDescriptor {
  resourceName: "portraits.2da";
  sourceObjectKey: string;
  sourceLayer: "module" | "hak" | "vanilla";
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}

export interface AreaApiPlaceablePortraitRow {
  rowIndex: number;
  baseResRef: string;
}

export interface AreaApiPlaceablePortraitCatalog {
  descriptor: AreaApiPlaceablePortraitTableDescriptor;
  rows: AreaApiPlaceablePortraitRow[];
}

export interface AreaApiCreaturePortraitRow {
  readonly rowIndex: number;
  readonly baseResRef: string;
  readonly sex: number;
  readonly race: number;
  readonly plot: 0;
}

export interface AreaApiCreaturePortraitCatalog {
  readonly descriptor: AreaApiPlaceablePortraitTableDescriptor;
  readonly rows: readonly AreaApiCreaturePortraitRow[];
}

export type AreaApiPlaceableFactionStorage =
  | { present: false }
  | { present: true; nativeType: "dword"; value: number };

export interface AreaApiPlaceableFactionCatalogDescriptor {
  resourceName: "repute.fac";
  sourceObjectKey: string;
  sha256: string;
  sizeBytes: number;
  factionCount: number;
}

export interface AreaApiPlaceableFactionRow {
  factionId: number;
  name: string;
  parentFactionId: number;
  isGlobal: boolean;
}

export interface AreaApiPlaceableFactionCatalog {
  descriptor: AreaApiPlaceableFactionCatalogDescriptor;
  rows: AreaApiPlaceableFactionRow[];
}

export interface AreaApiEncounterDifficultyCatalogDescriptor {
  readonly resourceName: "encdifficulty.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface AreaApiEncounterDifficultyCatalogRow {
  readonly rowIndex: number;
  readonly strRef: number;
  readonly value: number;
  readonly displayName: string;
  readonly displaySource: "strref" | "row_index";
}

export interface AreaApiEncounterDifficultyCatalog {
  readonly schemaVersion: "area-encounter-difficulty-catalog.v1";
  readonly descriptor: AreaApiEncounterDifficultyCatalogDescriptor;
  readonly rows: readonly AreaApiEncounterDifficultyCatalogRow[];
}

export interface AreaApiNativeLocalizedStringEntry {
  readonly languageId: number;
  readonly textBytesBase64: string;
}

export type AreaApiNativeLocalizedStringStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      strRef: number;
      entries: readonly AreaApiNativeLocalizedStringEntry[];
    }>;

export interface AreaApiWaypointMapNoteStorage {
  readonly hasMapNoteByte: 0 | 1;
  readonly mapNoteStorage: AreaApiNativeLocalizedStringStorage;
  readonly mapNoteEnabledByte: 0 | 1;
}

export interface AreaApiWaypointAppearanceProvenance {
  readonly present: true;
  readonly nativeType: "byte";
  readonly value: number;
  readonly table: Readonly<{
    resourceName: "waypoint.2da";
    sourceObjectKey: string;
    sourceLayer: "module" | "hak" | "vanilla";
    sha256: string;
    sizeBytes: number;
    rowCount: number;
    rowIndex: number;
  }>;
}

export type AreaApiPlaceableLocalizedStringEntry = AreaApiNativeLocalizedStringEntry;
export type AreaApiPlaceableLocalizedStringStorage = AreaApiNativeLocalizedStringStorage;

export interface AreaApiPlaceableLocalizedStrings {
  readonly locName: AreaApiPlaceableLocalizedStringStorage;
  readonly description: AreaApiPlaceableLocalizedStringStorage;
}

export interface AreaApiCreatureNameLocalizedStrings {
  readonly firstName: AreaApiNativeLocalizedStringStorage;
  readonly lastName: AreaApiNativeLocalizedStringStorage;
  readonly description?: AreaApiNativeLocalizedStringStorage;
}

export interface AreaApiItemLocalizedStrings {
  readonly localizedName: AreaApiNativeLocalizedStringStorage;
  readonly description: AreaApiNativeLocalizedStringStorage;
  readonly identifiedDescription: AreaApiNativeLocalizedStringStorage;
}

export type AreaApiPlaceableVariableTargetEntry = AuroraVariableTargetEntry;
export type AreaApiPlaceableVariableSourceEntry = AuroraVariableSourceEntry;
export type AreaApiPlaceableVariableProvenance = AuroraVariableProvenance;
export type AreaApiCreatureVariableTargetEntry = AuroraVariableTargetEntry;
export type AreaApiCreatureVariableSourceEntry = AuroraVariableSourceEntry;
export type AreaApiCreatureVariableProvenance = AuroraVariableProvenance;
export type AreaApiItemVariableTargetEntry = AuroraVariableTargetEntry;
export type AreaApiItemVariableSourceEntry = AuroraVariableSourceEntry;
export type AreaApiItemVariableProvenance = AuroraVariableProvenance;
export interface AreaApiItemPropertyListTargetEntry {
  readonly propertyName: number;
  readonly subtype: number;
  readonly costTable: number;
  readonly costValue: number;
  readonly param1: number;
  readonly param1Value: number;
  readonly chanceAppear: number;
}
export interface AreaApiItemPropertyListSourceEntry
  extends AreaApiItemPropertyListTargetEntry {
  readonly sourceIndex: number;
}
export interface AreaApiItemPropertyListProvenance {
  readonly present: boolean;
  readonly expectedEntries: readonly AreaApiItemPropertyListSourceEntry[];
}
export interface AreaApiItemInventorySourceEntry {
  readonly sourceIndex: number;
  readonly resRef: string;
  readonly x: number;
  readonly y: number;
}
export interface AreaApiItemVisualTransformValue {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly scaleZ: number;
  readonly rotateX: number;
  readonly rotateY: number;
  readonly rotateZ: number;
  readonly translateX: number;
  readonly translateY: number;
  readonly translateZ: number;
}
export type AreaApiItemVisualTransformStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: AreaApiItemVisualTransformValue }>;
export type AreaApiItemBaseItemModelType = 0 | 1 | 2 | 3;
export interface AreaApiItemArmorParts {
  readonly rFoot: number;
  readonly lFoot: number;
  readonly rShin: number;
  readonly lShin: number;
  readonly lThigh: number;
  readonly rThigh: number;
  readonly pelvis: number;
  readonly torso: number;
  readonly belt: number;
  readonly neck: number;
  readonly rFArm: number;
  readonly lFArm: number;
  readonly rBicep: number;
  readonly lBicep: number;
  readonly rShoul: number;
  readonly lShoul: number;
  readonly rHand: number;
  readonly lHand: number;
  readonly robe: number;
}
export interface AreaApiItemMaterialColors {
  readonly leather1: number;
  readonly leather2: number;
  readonly cloth1: number;
  readonly cloth2: number;
  readonly metal1: number;
  readonly metal2: number;
}
export type AreaApiItemBaseAppearanceValue =
  | Readonly<{
      baseItem: number;
      modelType: 0;
      appearance: Readonly<{ modelPart1: number }>;
    }>
  | Readonly<{
      baseItem: number;
      modelType: 1;
      appearance: Readonly<{
        modelPart1: number;
        materialColors: AreaApiItemMaterialColors;
      }>;
    }>
  | Readonly<{
      baseItem: number;
      modelType: 2;
      appearance: Readonly<{
        modelPart1: number;
        modelPart2: number;
        modelPart3: number;
      }>;
    }>
  | Readonly<{
      baseItem: number;
      modelType: 3;
      appearance: Readonly<{
        armorParts: AreaApiItemArmorParts;
        materialColors: AreaApiItemMaterialColors;
      }>;
    }>;
export interface AreaApiItemBaseAppearanceProvenance {
  readonly expectedValue: AreaApiItemBaseAppearanceValue;
  readonly tableSha256: string;
  readonly tableRowCount: number;
}
export interface AreaApiItemBaseItemCatalogDescriptor {
  readonly resourceName: "baseitems.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}
export interface AreaApiItemBaseItemCatalogRow {
  readonly rowIndex: number;
  readonly nameStrRef?: number;
  readonly label?: string;
  readonly modelType: AreaApiItemBaseItemModelType;
  readonly itemClass?: string;
  readonly displayName: string;
  readonly invSlotWidth?: number;
  readonly invSlotHeight?: number;
}
export interface AreaApiItemBaseItemCatalog {
  readonly descriptor: AreaApiItemBaseItemCatalogDescriptor;
  readonly rows: readonly AreaApiItemBaseItemCatalogRow[];
}
export type AreaApiVariableTargetEntry = AuroraVariableTargetEntry;
export type AreaApiVariableSourceEntry = AuroraVariableSourceEntry;
export type AreaApiVariableProvenance = AuroraVariableProvenance;

export interface AreaApiObjectPlacement {
  objectId: string;
  sourceIndex?: number;
  kind: AreaApiObjectKind;
  templateId: string;
  resRef?: string;
  tag?: string;
  localizedName?: string;
  description?: string;
  appearanceType?: number;
  genericType?: number;
  isStatic?: boolean;
  placeableBasicIdentity?: AreaApiPlaceableBasicIdentity;
  placeableTrapType?: AreaApiPlaceableTrapTypeStorage;
  placeableBodyBag?: AreaApiPlaceableBodyBagStorage;
  placeablePortraitId?: AreaApiPlaceablePortraitIdStorage;
  placeableFaction?: AreaApiPlaceableFactionStorage;
  placeableVariables?: AreaApiPlaceableVariableProvenance;
  placeableTemplateResRef?: string;
  placeableLocalizedStrings?: AreaApiPlaceableLocalizedStrings;
  creatureTag?: AreaApiCreatureTagStorage;
  creatureConversation?: AreaApiCreatureConversationStorage;
  creatureInterruptable?: AreaApiCreatureInterruptableStorage;
  creatureAdvancedFlags?: AreaApiCreatureAdvancedFlagsStorage;
  creatureBodyBag?: AreaApiCreatureBodyBagStorage;
  creatureDecayTime?: AreaApiCreatureDecayTimeStorage;
  creatureAppearance?: AreaApiCreatureAppearanceStorage;
  creatureGender?: AreaApiCreatureGenderStorage;
  creaturePerceptionRange?: AreaApiCreaturePerceptionRangeStorage;
  creatureWalkRate?: AreaApiCreatureWalkRateStorage;
  creatureSoundSetFile?: AreaApiCreatureSoundSetFileStorage;
  creatureStartingPackage?: AreaApiCreatureStartingPackageStorage;
  creatureSkillList?: AreaApiCreatureSkillListStorage;
  creatureFeatList?: AreaApiCreatureFeatListStorage;
  creatureSpecialAbilityList?: AreaApiCreatureSpecialAbilityListStorage;
  creatureVariables?: AreaApiCreatureVariableProvenance;
  creatureClassLevelState?: AreaApiCreatureClassLevelState;
  creatureClassIdentityState?: AreaApiCreatureClassIdentityState;
  creaturePhenotype?: AreaApiCreaturePhenotypeStorage;
  creaturePortrait?: AreaApiCreaturePortraitStorage;
  creatureChallengeRating?: AreaApiCreatureChallengeRatingStorage;
  creatureAbilityScores?: AreaApiCreatureAbilityScoresStorage;
  creatureAppearanceColors?: AreaApiCreatureAppearanceColorsStorage;
  creatureBodyParts?: AreaApiCreatureBodyPartsStorage;
  creatureAppendages?: AreaApiCreatureAppendagesStorage;
  creatureHitPointState?: AreaApiCreatureHitPointState;
  creatureNaturalArmorClass?: AreaApiCreatureNaturalArmorClassStorage;
  creatureSavingThrowBonuses?: AreaApiCreatureSavingThrowBonusesStorage;
  creatureAlignment?: AreaApiCreatureAlignmentStorage;
  creatureFaction?: AreaApiCreatureFactionStorage;
  creatureTemplateResRef?: AreaApiCreatureTemplateResRefStorage;
  creatureSpecialIdentityStrings?: AreaApiCreatureSpecialIdentityStringsStorage;
  creatureScriptResRefs?: AreaApiCreatureScriptResRefsStorage;
  creatureLocalizedStrings?: AreaApiCreatureNameLocalizedStrings;
  creatureMetadata?: Record<string, AreaApiCreatureMetadataPrimitive>;
  placeableMetadata?: Record<string, AreaApiCreatureMetadataPrimitive>;
  itemMetadata?: Record<string, AreaApiCreatureMetadataPrimitive>;
  encounterMetadata?: Record<string, AreaApiCreatureMetadataPrimitive>;
  waypointMetadata?: Record<string, AreaApiCreatureMetadataPrimitive>;
  triggerMetadata?: Record<string, AreaApiCreatureMetadataPrimitive>;
  storeMetadata?: AreaApiStoreMetadata;
  itemTag?: AreaApiItemTagStorage;
  triggerTag?: AreaApiTriggerTagStorage;
  triggerTemplateResRef?: AreaApiTriggerTemplateResRefStorage;
  triggerLocalizedName?: AreaApiNativeLocalizedStringStorage;
  triggerScriptResRefs?: AreaApiTriggerScriptResRefsStorage;
  triggerTransitionStorage?: AreaApiTriggerTransitionStorage;
  triggerCoreProperties?: AreaApiTriggerCoreProperties;
  triggerTrapProperties?: AreaApiTriggerTrapProperties;
  triggerVariables?: AreaApiVariableProvenance;
  encounterTag?: AreaApiEncounterTagStorage;
  encounterTemplateResRef?: AreaApiEncounterTemplateResRefStorage;
  waypointTag?: AreaApiWaypointTagStorage;
  waypointTemplateResRef?: AreaApiWaypointTemplateResRefStorage;
  waypointLocalizedName?: AreaApiNativeLocalizedStringStorage;
  waypointDescription?: AreaApiNativeLocalizedStringStorage;
  waypointMapNote?: AreaApiWaypointMapNoteStorage;
  waypointAppearance?: AreaApiWaypointAppearanceProvenance;
  waypointVariables?: AreaApiVariableProvenance;
  encounterActive?: AreaApiEncounterActiveStorage;
  encounterPlayerOnly?: AreaApiEncounterPlayerOnlyStorage;
  encounterReset?: AreaApiEncounterResetStorage;
  encounterResetTime?: AreaApiEncounterResetTimeStorage;
  encounterSpawnOption?: AreaApiEncounterSpawnOptionStorage;
  encounterRespawns?: AreaApiEncounterRespawnsStorage;
  encounterCreatureCounts?: AreaApiEncounterCreatureCountStorage;
  encounterScriptResRefs?: AreaApiEncounterScriptResRefsStorage;
  encounterFaction?: AreaApiEncounterFactionStorage;
  encounterDifficulty?: AreaApiEncounterDifficultyStorage;
  encounterLocalizedName?: AreaApiNativeLocalizedStringStorage;
  encounterVariables?: AreaApiVariableProvenance;
  encounterCreatureList?: AreaApiEncounterCreatureListProvenance;
  encounterSpawnPoints?: AreaApiEncounterSpawnPointListProvenance;
  itemTemplateResRef?: AreaApiItemTemplateResRefStorage;
  itemInstanceState?: AreaApiItemInstanceStateStorage;
  itemLocalizedStrings?: AreaApiItemLocalizedStrings;
  itemVariables?: AreaApiItemVariableProvenance;
  itemPropertyList?: AreaApiItemPropertyListProvenance;
  itemInventoryItems?: readonly AreaApiItemInventorySourceEntry[];
  itemVisualTransform?: AreaApiItemVisualTransformStorage;
  itemBaseAppearance?: AreaApiItemBaseAppearanceProvenance;
  x: number;
  y: number;
  z: number;
  bearing: number;
  visualTransform?: AreaApiObjectVisualTransform;
  soundPositioning?: AreaApiObjectSoundPositioning;
  soundIntervalVariation?: AreaSoundIntervalVariationStorage;
  soundVolume?: AreaSoundVolumeStorage;
  soundActive?: AreaSoundActiveStorage;
  soundPlayOrder?: AreaSoundPlayOrderStorage;
  soundPlayStyle?: AreaSoundPlayStyleStorage;
  soundPlayback?: AreaSoundPlaybackStorage;
  soundProfile?: AreaSoundProfileStorage;
  soundSchedule?: AreaSoundScheduleStorage;
  doorTransition?: AreaApiObjectDoorTransition;
  polygonGeometry?: AreaObjectPolygonGeometry;
}

export interface AreaApiDetail {
  areaId: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  tags: string[];
  comments?: string;
  eventScripts?: Readonly<Partial<Record<
    "onEnter" | "onExit" | "onHeartbeat" | "onUserDefined",
    string
  >>>;
  basicIdentity?: Readonly<{
    name?: string;
    nameProfile?: "simple_inline_ascii" | "multi_entry_inline_ascii";
    nameEntries?: readonly Readonly<{ languageId: number; text: string }>[];
    tag?: string;
  }>;
  advancedFlags?: AreaAdvancedFlags;
  visualEnvironment?: AreaVisualEnvironment;
  visualEnvironmentScalarControls?: AreaVisualEnvironmentScalarControls;
  visualEnvironmentCatalogSelection?: AreaVisualEnvironmentCatalogSelection;
  variables?: AreaApiVariableProvenance;
  audioEnvironment?: AreaAudioEnvironment;
  audioEnvironmentCatalogs?: EffectiveAreaAudioCatalogBundle;
  visualEnvironmentCatalogs?: EffectiveAreaVisualEnvironmentCatalogBundle;
  loadingScreenCatalog?: EffectiveAreaLoadingScreenCatalog;
  moduleStartLocation?: Readonly<{
    areaResRef: string;
    x: number;
    y: number;
    z: number;
    directionX: number;
    directionY: number;
  }>;
  moduleStartLocationTargets?: readonly string[];
  benchmark: boolean;
  previewImageUrl: string;
  textureAtlas: AreaApiTextureAtlas;
  tileSet?: string;
  tiles?: AreaApiTileInstance[];
  auroraVfxCollision?: AuroraAreaVfxCollisionContract;
  auroraWorldTimer?: AuroraWorldTimerContract;
  lighting?: AreaApiGlobalLighting;
  placeableTrapTypeCatalog?: AreaApiPlaceableTrapTypeCatalog;
  placeableBodyBagCatalog?: AreaApiPlaceableBodyBagCatalog;
  placeablePortraitCatalog?: AreaApiPlaceablePortraitCatalog;
  creaturePortraitCatalog?: AreaApiCreaturePortraitCatalog;
  itemBaseItemCatalog?: AreaApiItemBaseItemCatalog;
  placeableFactionCatalog?: AreaApiPlaceableFactionCatalog;
  encounterDifficultyCatalog?: AreaApiEncounterDifficultyCatalog;
  composition: AreaApiObjectCounts;
  updatedAt: string;
  objects: AreaApiObjectPlacement[];
  sourceResources?: {
    areSha256: string;
    gitSha256?: string;
    gicSha256?: string;
    ifoSha256?: string;
  };
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
