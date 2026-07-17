import type { ProcessingCacheEntry } from "../../../catalog/application/ports/placeable-processing-cache.port";
import type { AreaProcessingResult } from "../../domain/area.types";

export const AREA_PROCESSING_CACHE = Symbol("AREA_PROCESSING_CACHE");

export type AreaProcessingCacheEntry = ProcessingCacheEntry<AreaProcessingResult>;

export interface AreaProcessingCachePort {
  get(key: string): Promise<AreaProcessingCacheEntry | null>;
  set(key: string, value: AreaProcessingResult): Promise<AreaProcessingCacheEntry>;
}
