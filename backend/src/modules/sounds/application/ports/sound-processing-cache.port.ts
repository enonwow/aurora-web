import type { ProcessingCacheEntry } from "../../../catalog/application/ports/placeable-processing-cache.port";
import type { SoundProcessingResult } from "../../domain/sound.types";

export const SOUND_PROCESSING_CACHE = Symbol("SOUND_PROCESSING_CACHE");

export type SoundProcessingCacheEntry = ProcessingCacheEntry<SoundProcessingResult>;

export interface SoundProcessingCachePort {
  get(key: string): Promise<SoundProcessingCacheEntry | null>;
  set(key: string, value: SoundProcessingResult): Promise<SoundProcessingCacheEntry>;
}
