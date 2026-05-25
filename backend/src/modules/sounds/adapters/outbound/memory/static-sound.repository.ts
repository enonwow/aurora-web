import { Injectable } from "@nestjs/common";
import type { SoundRepositoryPort } from "../../../application/ports/sound-repository.port";
import type {
  SoundListItem,
  SoundListQuery,
  SoundListResult,
  SoundRecord
} from "../../../domain/sound.types";
import { buildSoundProcessCacheKey } from "../../../domain/sound-processing.builders";

interface IndexedSound {
  record: SoundRecord;
  listItem: SoundListItem;
  processingCacheKey: string;
  searchable: string;
  categoryLower: string;
  tagsLower: Set<string>;
}

const SOUNDS: SoundRecord[] = [
  {
    soundId: "sound_ambient_city_market_001",
    resref: "amb_city_market_day",
    name: "City Market Day Ambience",
    category: "ambient",
    tags: ["city", "market", "day", "crowd"],
    benchmark: true,
    previewWaveformUrl: "/assets/previews/sounds/city-market-day.webp",
    audioAssetId: "audio/ambient/city-market-day",
    format: "ogg",
    sampleRateHz: 48000,
    channels: 2,
    spatialMode: "2d",
    loop: true,
    metrics: {
      durationMs: 32210,
      cues: 4,
      emitters: 0
    },
    updatedAt: "2026-05-25T12:30:00.000Z"
  },
  {
    soundId: "sound_music_city_theme_002",
    resref: "mus_city_theme_main",
    name: "City Theme Main Loop",
    category: "music",
    tags: ["city", "theme", "loop"],
    benchmark: true,
    previewWaveformUrl: "/assets/previews/sounds/city-theme-main.webp",
    audioAssetId: "audio/music/city-theme-main",
    format: "ogg",
    sampleRateHz: 48000,
    channels: 2,
    spatialMode: "2d",
    loop: true,
    metrics: {
      durationMs: 108442,
      cues: 1,
      emitters: 0
    },
    updatedAt: "2026-05-25T12:30:00.000Z"
  },
  {
    soundId: "sound_effect_forge_loop_003",
    resref: "sfx_forge_loop_heavy",
    name: "Forge Loop Heavy",
    category: "effect",
    tags: ["forge", "metal", "loop", "interior"],
    benchmark: true,
    previewWaveformUrl: "/assets/previews/sounds/forge-loop-heavy.webp",
    audioAssetId: "audio/effects/forge-loop-heavy",
    format: "wav",
    sampleRateHz: 44100,
    channels: 1,
    spatialMode: "3d",
    loop: true,
    metrics: {
      durationMs: 15433,
      cues: 7,
      emitters: 1
    },
    updatedAt: "2026-05-25T11:00:00.000Z"
  },
  {
    soundId: "sound_ambient_swamp_night_004",
    resref: "amb_swamp_night",
    name: "Swamp Night Ambience",
    category: "ambient",
    tags: ["swamp", "night", "outdoor", "insects"],
    benchmark: false,
    previewWaveformUrl: "/assets/previews/sounds/swamp-night.webp",
    audioAssetId: "audio/ambient/swamp-night",
    format: "ogg",
    sampleRateHz: 44100,
    channels: 2,
    spatialMode: "2d",
    loop: true,
    metrics: {
      durationMs: 45220,
      cues: 5,
      emitters: 2
    },
    updatedAt: "2026-05-24T09:10:00.000Z"
  },
  {
    soundId: "sound_effect_door_creak_005",
    resref: "sfx_door_creak_long",
    name: "Door Creak Long",
    category: "effect",
    tags: ["door", "creak", "interior"],
    benchmark: false,
    previewWaveformUrl: "/assets/previews/sounds/door-creak-long.webp",
    audioAssetId: "audio/effects/door-creak-long",
    format: "wav",
    sampleRateHz: 44100,
    channels: 1,
    spatialMode: "3d",
    loop: false,
    metrics: {
      durationMs: 2780,
      cues: 2,
      emitters: 0
    },
    updatedAt: "2026-05-24T09:10:00.000Z"
  }
];

const INDEXED_SOUNDS: IndexedSound[] = SOUNDS.map((sound) => ({
  record: sound,
  listItem: mapSoundToListItem(sound),
  processingCacheKey: buildSoundProcessCacheKey(sound),
  searchable: buildSoundSearchableText(sound),
  categoryLower: sound.category.toLowerCase(),
  tagsLower: new Set(sound.tags.map((tag) => tag.toLowerCase()))
}));

const SOUNDS_BY_ID = new Map<string, SoundRecord>(
  INDEXED_SOUNDS.map((entry) => [entry.record.soundId, entry.record])
);

const SOUNDS_PROCESSING_BY_ID = new Map<string, { cacheKey: string }>(
  INDEXED_SOUNDS.map((entry) => [entry.record.soundId, { cacheKey: entry.processingCacheKey }])
);

@Injectable()
export class StaticSoundRepository implements SoundRepositoryPort {
  async list(query: SoundListQuery): Promise<SoundListResult> {
    const normalizedQuery = query.query?.toLowerCase().trim();
    const normalizedCategory = query.category?.toLowerCase().trim();
    const normalizedTag = query.tag?.toLowerCase().trim();

    const filtered = INDEXED_SOUNDS.filter((sound) => {
      if (!query.query) {
        return true;
      }
      return sound.searchable.includes(normalizedQuery ?? "");
    })
      .filter((sound) => {
        if (!query.category) {
          return true;
        }
        return sound.categoryLower === normalizedCategory;
      })
      .filter((sound) => {
        if (!query.tag) {
          return true;
        }
        return sound.tagsLower.has(normalizedTag ?? "");
      })
      .filter((sound) => {
        if (typeof query.benchmark !== "boolean") {
          return true;
        }
        return sound.record.benchmark === query.benchmark;
      });

    const items = filtered
      .slice(query.offset, query.offset + query.limit)
      .map((sound) => sound.listItem);

    return {
      items,
      total: filtered.length,
      limit: query.limit,
      offset: query.offset
    };
  }

  async findById(soundId: string): Promise<SoundRecord | null> {
    return SOUNDS_BY_ID.get(soundId) ?? null;
  }

  getPrecomputedSoundProcessing(soundId: string): { cacheKey: string } | null {
    return SOUNDS_PROCESSING_BY_ID.get(soundId) ?? null;
  }
}

function mapSoundToListItem(sound: SoundRecord): SoundListItem {
  return {
    soundId: sound.soundId,
    resref: sound.resref,
    name: sound.name,
    category: sound.category,
    tags: sound.tags,
    benchmark: sound.benchmark,
    previewWaveformUrl: sound.previewWaveformUrl,
    spatialMode: sound.spatialMode,
    metrics: sound.metrics,
    updatedAt: sound.updatedAt
  };
}

function buildSoundSearchableText(sound: SoundRecord): string {
  return [sound.name, sound.soundId, sound.resref, ...sound.tags].join("|").toLowerCase();
}
