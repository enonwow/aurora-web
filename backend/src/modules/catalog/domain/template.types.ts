export type TemplateKind = "placeable" | "creature" | "item";
export type PlaceableSubtype =
  | "generic"
  | "door"
  | "vfx"
  | "container"
  | "light_source"
  | "trigger_proxy";
export type PlaceableSubtypeInput = PlaceableSubtype | "vvx" | "vvxy";

export type PlaceableAssetRole =
  | "model"
  | "texture"
  | "material"
  | "vfx"
  | "metadata"
  | "unknown";

export interface PlaceableAssetEntry {
  assetId: string;
  role: PlaceableAssetRole;
  fileName: string;
  objectKey: string;
  extension: string;
  sizeBytes: number;
  contentType: string;
  etag?: string;
}

export interface PlaceableAssetManifest {
  version: "placeable-asset-manifest/v1";
  source: "module-blob-snapshot";
  generatedAt: string;
  moduleHash?: string;
  assetCount: number;
  candidatesScanned: number;
  assets: PlaceableAssetEntry[];
}

export interface TemplateRecord {
  templateId: string;
  kind: TemplateKind;
  placeableSubtype?: PlaceableSubtype;
  benchmarkCandidate?: boolean;
  benchmarkBucket?: string;
  resref: string;
  name: string;
  category: string;
  tags: string[];
  previewImageUrl: string;
  metadata: Record<string, string | number | boolean>;
}

export interface TemplateListQuery {
  query?: string;
  category?: string;
  tag?: string;
  subtype?: PlaceableSubtype;
  benchmark?: boolean;
  limit: number;
  offset: number;
}

export interface TemplateListResult {
  items: TemplateRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlaceableProcessQuery {
  templateId?: string;
  resref?: string;
  subtypeHint?: PlaceableSubtypeInput;
  bypassCache: boolean;
  includeBenchmarkMetadata: boolean;
}

export interface TemplateProcessQuery {
  templateId?: string;
  resref?: string;
  bypassCache: boolean;
  includeBenchmarkMetadata: boolean;
}

export interface PlaceableRenderContract {
  backendType: PlaceableSubtype;
  frontendType: "placeable" | "door" | "vfx";
  rendererPreset:
    | "placeable-generic"
    | "placeable-container"
    | "placeable-light"
    | "placeable-trigger-proxy"
    | "door-standard"
    | "vfx-emitter";
  isDoor: boolean;
  isVfx: boolean;
}

export interface TemplateRenderContract {
  backendType: "creature" | "item";
  frontendType: "creature" | "item";
  rendererPreset: "creature-standard" | "item-standard";
}

export interface PlaceableRuntimeProjection {
  source: {
    fileType?: string;
    fileVersion?: string;
    structTypeId?: number;
  };
  identity: {
    templateResRef?: string;
    tag?: string;
    conversation?: string;
    keyName?: string;
  };
  interaction: {
    useable?: boolean;
    hasInventory?: boolean;
    bodyBag?: boolean;
    isStatic?: boolean;
    autoRemoveKey?: boolean;
    interruptable?: boolean;
  };
  locking: {
    factionId?: number;
    keyRequired?: boolean;
    lockable?: boolean;
    locked?: boolean;
    closeLockDc?: number;
    openLockDc?: number;
    invulnerable?: boolean;
  };
  trap: {
    trapDetectable?: boolean;
    trapDetectDc?: number;
    trapDisarmable?: boolean;
    disarmDc?: number;
    trapFlag?: boolean;
    trapOneShot?: boolean;
    trapType?: number;
  };
  state: {
    appearanceType?: number;
    animationState?: number;
    portraitId?: number;
    portraitResRef?: string;
    currentHitPoints?: number;
    hardness?: number;
    lightState?: number;
  };
  scripts: Record<string, string>;
}

export interface PlaceableValidationIssue {
  code: string;
  severity: "warn" | "error";
  message: string;
}

export interface CreatureRuntimeProjection {
  source: {
    fileType?: string;
    fileVersion?: string;
    structTypeId?: number;
  };
  identity: {
    templateResRef?: string;
    tag?: string;
    conversation?: string;
    gender?: number;
    race?: number;
    subrace?: string;
    deity?: string;
    phenotype?: number;
  };
  appearance: {
    appearanceType?: number;
    portraitId?: number;
    portraitResRef?: string;
    soundSetFile?: number;
    wingsNew?: number;
    tailNew?: number;
  };
  faction: {
    factionId?: number;
  };
  stats: {
    challengeRating?: number;
    crAdjust?: number;
    perceptionRange?: number;
    naturalAc?: number;
    hitPoints?: number;
    currentHitPoints?: number;
    maxHitPoints?: number;
    reflexBonus?: number;
    willBonus?: number;
    fortitudeBonus?: number;
    goodEvil?: number;
    lawfulChaotic?: number;
  };
  lists: {
    classListCount?: number;
    skillListCount?: number;
    featListCount?: number;
    templateListCount?: number;
    specAbilityListCount?: number;
  };
  scripts: Record<string, string>;
}

export interface CreatureValidationIssue {
  code: string;
  severity: "warn" | "error";
  message: string;
}

export interface TemplateProcessingResult {
  templateId: string;
  kind: "creature" | "item";
  resref: string;
  name: string;
  category: string;
  benchmarkCandidate: boolean;
  benchmarkBucket?: string;
  metadata: Record<string, string | number | boolean>;
  render: TemplateRenderContract;
  creatureRuntime?: CreatureRuntimeProjection;
  creatureValidationIssues?: CreatureValidationIssue[];
  processedAt: string;
}

export interface PlaceableBenchmarkRunQuery {
  templateIds?: string[];
  iterations: number;
  warmupIterations: number;
  bypassCache: boolean;
}

export interface BenchmarkDurationSummary {
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export interface PlaceableBenchmarkResult {
  datasetFingerprint: string;
  config: {
    iterations: number;
    warmupIterations: number;
    bypassCache: boolean;
    candidates: number;
  };
  timing: {
    startedAt: string;
    finishedAt: string;
  };
  metrics: {
    overall: BenchmarkDurationSummary;
    perCandidate: Array<{
      templateId: string;
      resref: string;
      placeableSubtype: PlaceableSubtype;
      metrics: BenchmarkDurationSummary;
    }>;
  };
}
