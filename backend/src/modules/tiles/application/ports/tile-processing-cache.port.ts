import type { ProcessingCacheEntry } from "../../../catalog/application/ports/placeable-processing-cache.port";
import type { TileProcessingResult } from "../../domain/tile.types";

export const TILE_PROCESSING_CACHE = Symbol("TILE_PROCESSING_CACHE");

export type TileProcessingCacheEntry = ProcessingCacheEntry<TileProcessingResult>;

export interface TileProcessingCachePort {
  get(key: string): Promise<TileProcessingCacheEntry | null>;
  set(key: string, value: TileProcessingResult): Promise<TileProcessingCacheEntry>;
}
