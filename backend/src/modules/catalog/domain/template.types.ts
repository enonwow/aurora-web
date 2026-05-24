export type TemplateKind = "placeable" | "creature" | "item";
export type PlaceableSubtype =
  | "generic"
  | "door"
  | "vfx"
  | "container"
  | "light_source"
  | "trigger_proxy";
export type PlaceableSubtypeInput = PlaceableSubtype | "vvx" | "vvxy";

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
