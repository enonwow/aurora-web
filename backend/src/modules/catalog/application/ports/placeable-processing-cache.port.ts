import type {
  PlaceableAssetManifest,
  PlaceableRenderPackage,
  PlaceableRenderContract,
  PlaceableRuntimeProjection,
  PlaceableSubtype,
  PlaceableValidationIssue
} from "../../domain/template.types";

export const PLACEABLE_PROCESSING_CACHE = Symbol("PLACEABLE_PROCESSING_CACHE");

export interface ProcessingCacheEntry<TValue> {
  key: string;
  value: TValue;
  storedAt: string;
  hits: number;
}

export interface PlaceableProcessingResult {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  placeableSubtype: PlaceableSubtype;
  render: PlaceableRenderContract;
  benchmarkCandidate: boolean;
  benchmarkBucket?: string;
  metadata: Record<string, string | number | boolean>;
  placeableRuntime?: PlaceableRuntimeProjection;
  placeableValidationIssues?: PlaceableValidationIssue[];
  renderPackage?: PlaceableRenderPackage;
  assetManifest: PlaceableAssetManifest;
  classification: {
    source: "template" | "hint";
    inputSubtype?: string;
    normalizedSubtype: PlaceableSubtype;
    mismatchWithTemplate: boolean;
  };
  processedAt: string;
}

export type PlaceableProcessingCacheEntry = ProcessingCacheEntry<PlaceableProcessingResult>;

export interface PlaceableProcessingCachePort {
  get<TValue = unknown>(key: string): Promise<ProcessingCacheEntry<TValue> | null>;
  set<TValue = unknown>(
    key: string,
    value: TValue
  ): Promise<ProcessingCacheEntry<TValue>>;
}
