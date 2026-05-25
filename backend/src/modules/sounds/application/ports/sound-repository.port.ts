import type { SoundListQuery, SoundListResult, SoundRecord } from "../../domain/sound.types";

export const SOUND_REPOSITORY = Symbol("SOUND_REPOSITORY");

export interface SoundRepositoryPort {
  list(query: SoundListQuery): Promise<SoundListResult>;
  findById(soundId: string): Promise<SoundRecord | null>;
  getPrecomputedSoundProcessing?(soundId: string): { cacheKey: string } | null;
}
