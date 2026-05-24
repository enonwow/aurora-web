import type { PlaceableRenderContract, PlaceableSubtype } from "../../domain/template.types";

export const PLACEABLE_PROCESSING_CACHE = Symbol("PLACEABLE_PROCESSING_CACHE");

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
  classification: {
    source: "template" | "hint";
    inputSubtype?: string;
    normalizedSubtype: PlaceableSubtype;
    mismatchWithTemplate: boolean;
  };
  processedAt: string;
}

export interface PlaceableProcessingCacheEntry {
  key: string;
  value: PlaceableProcessingResult;
  storedAt: string;
  hits: number;
}

export interface PlaceableProcessingCachePort {
  get(key: string): Promise<PlaceableProcessingCacheEntry | null>;
  set(key: string, value: PlaceableProcessingResult): Promise<PlaceableProcessingCacheEntry>;
}
