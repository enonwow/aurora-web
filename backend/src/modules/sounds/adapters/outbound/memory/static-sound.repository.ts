import { Injectable } from "@nestjs/common";
import type { SoundRepositoryPort } from "../../../application/ports/sound-repository.port";
import type {
  SoundListItem,
  SoundListQuery,
  SoundListResult,
  SoundRecord,
  SoundReverseMapping,
  SoundSourceLayer
} from "../../../domain/sound.types";
import { buildSoundProcessCacheKey } from "../../../domain/sound-processing.builders";

interface IndexedSound {
  record: SoundRecord;
  listItem: SoundListItem;
  processingCacheKey: string;
  searchable: string;
  categoryLower: string;
  formatLower: string;
  spatialModeLower: string;
  bindingKeyLower: string;
  sourceFieldLower: string;
  defaultsTableLower: string | null;
  tagsLower: Set<string>;
}

const DEFAULT_AREA_BINDING = {
  areaKey: "GI_sound_area" as const,
  randomKey: "GI_sound_rndm" as const,
  positionalKey: "GI_sound_pos" as const
};

const DEFAULT_REVERSE_MAPPING: SoundReverseMapping = {
  palette: "soundpalstd",
  soundPalette: "soundpal",
  soundSetTable: "soundset",
  soundSetTypeTable: "soundsettype",
  soundTypesTable: "soundtypes",
  categoryFilterTable: "soundcatfilters",
  areaBinding: DEFAULT_AREA_BINDING,
  soundDefaultsTimingTable: "sounddefaultstim",
  soundDefaultsPositionTable: "sounddefaultspos"
};

const SOUNDS: SoundRecord[] = [
  buildStaticSound({
    soundId: "sound_ambient_city_market_001",
    resref: "amb_city_market_day",
    name: "City Market Day Ambience",
    category: "ambient",
    tags: ["city", "market", "day", "crowd"],
    benchmark: true,
    previewWaveformUrl: "/assets/previews/sounds/city-market-day.webp",
    audioAssetId: "audio/ambient/city-market-day",
    sourceObjectKey: "modules/current/audio/ambient/amb_city_market_day.ogg",
    sourceContentType: "audio/ogg",
    sourceSizeBytes: 245760,
    sourceEtag: "static-amb-city-market",
    sourceFingerprint: "static:sound:amb_city_market_day:v2",
    format: "ogg",
    sampleRateHz: 48000,
    channels: 2,
    spatialMode: "2d",
    loop: true,
    playback: {
      mode: "interval",
      intervalSeconds: 30,
      ambientOnly: true
    },
    auroraUsage: {
      bindingKey: "GI_sound_area",
      sourceField: "AmbientSoundDay"
    },
    metrics: {
      durationMs: 32210,
      cues: 4,
      emitters: 0
    },
    updatedAt: "2026-05-25T12:30:00.000Z"
  }),
  buildStaticSound({
    soundId: "sound_music_city_theme_002",
    resref: "mus_city_theme_main",
    name: "City Theme Main Loop",
    category: "music",
    tags: ["city", "theme", "loop"],
    benchmark: true,
    previewWaveformUrl: "/assets/previews/sounds/city-theme-main.webp",
    audioAssetId: "audio/music/city-theme-main",
    sourceObjectKey: "modules/current/audio/music/mus_city_theme_main.bmu",
    sourceContentType: "audio/mpeg",
    sourceSizeBytes: 612384,
    sourceEtag: "static-mus-city-theme",
    sourceFingerprint: "static:sound:mus_city_theme_main:v2",
    format: "bmu",
    sampleRateHz: 48000,
    channels: 2,
    spatialMode: "2d",
    loop: true,
    playback: {
      mode: "continuous",
      ambientOnly: false
    },
    auroraUsage: {
      bindingKey: "GI_sound_area",
      sourceField: "MusicDay"
    },
    metrics: {
      durationMs: 108442,
      cues: 1,
      emitters: 0
    },
    updatedAt: "2026-05-25T12:30:00.000Z"
  }),
  buildStaticSound({
    soundId: "sound_effect_forge_loop_003",
    resref: "sfx_forge_loop_heavy",
    name: "Forge Loop Heavy",
    category: "effect",
    tags: ["forge", "metal", "loop", "interior"],
    benchmark: true,
    previewWaveformUrl: "/assets/previews/sounds/forge-loop-heavy.webp",
    audioAssetId: "audio/effects/forge-loop-heavy",
    sourceObjectKey: "modules/current/audio/effects/sfx_forge_loop_heavy.wav",
    sourceContentType: "audio/wav",
    sourceSizeBytes: 144320,
    sourceEtag: "static-sfx-forge-loop",
    sourceFingerprint: "static:sound:sfx_forge_loop_heavy:v2",
    format: "wav",
    sampleRateHz: 44100,
    channels: 1,
    spatialMode: "3d",
    loop: true,
    playback: {
      mode: "looping",
      ambientOnly: false
    },
    auroraUsage: {
      bindingKey: "GI_sound_pos",
      sourceField: "PlacedSound",
      defaultsTable: "sounddefaultspos"
    },
    metrics: {
      durationMs: 15433,
      cues: 7,
      emitters: 1
    },
    updatedAt: "2026-05-25T11:00:00.000Z"
  }),
  buildStaticSound({
    soundId: "sound_ambient_swamp_night_004",
    resref: "amb_swamp_night",
    name: "Swamp Night Ambience",
    category: "ambient",
    tags: ["swamp", "night", "outdoor", "insects"],
    benchmark: false,
    previewWaveformUrl: "/assets/previews/sounds/swamp-night.webp",
    audioAssetId: "audio/ambient/swamp-night",
    sourceObjectKey: "modules/current/audio/ambient/amb_swamp_night.ogg",
    sourceContentType: "audio/ogg",
    sourceSizeBytes: 308224,
    sourceEtag: "static-amb-swamp-night",
    sourceFingerprint: "static:sound:amb_swamp_night:v2",
    format: "ogg",
    sampleRateHz: 44100,
    channels: 2,
    spatialMode: "2d",
    loop: true,
    playback: {
      mode: "interval",
      intervalSeconds: 45,
      ambientOnly: true
    },
    auroraUsage: {
      bindingKey: "GI_sound_area",
      sourceField: "AmbientSoundNight"
    },
    metrics: {
      durationMs: 45220,
      cues: 5,
      emitters: 2
    },
    updatedAt: "2026-05-24T09:10:00.000Z"
  }),
  buildStaticSound({
    soundId: "sound_effect_door_creak_005",
    resref: "sfx_door_creak_long",
    name: "Door Creak Long",
    category: "effect",
    tags: ["door", "creak", "interior"],
    benchmark: false,
    previewWaveformUrl: "/assets/previews/sounds/door-creak-long.webp",
    audioAssetId: "audio/effects/door-creak-long",
    sourceObjectKey: "modules/current/audio/effects/sfx_door_creak_long.wav",
    sourceContentType: "audio/wav",
    sourceSizeBytes: 63218,
    sourceEtag: "static-sfx-door-creak",
    sourceFingerprint: "static:sound:sfx_door_creak_long:v2",
    format: "wav",
    sampleRateHz: 44100,
    channels: 1,
    spatialMode: "3d",
    loop: false,
    playback: {
      mode: "random",
      ambientOnly: false
    },
    auroraUsage: {
      bindingKey: "GI_sound_rndm",
      sourceField: "RandomSound",
      defaultsTable: "sounddefaultstim"
    },
    metrics: {
      durationMs: 2780,
      cues: 2,
      emitters: 0
    },
    updatedAt: "2026-05-24T09:10:00.000Z"
  })
];

const INDEXED_SOUNDS: IndexedSound[] = SOUNDS.map((sound) => ({
  record: sound,
  listItem: mapSoundToListItem(sound),
  processingCacheKey: buildSoundProcessCacheKey(sound),
  searchable: buildSoundSearchableText(sound),
  categoryLower: sound.category.toLowerCase(),
  formatLower: sound.format.toLowerCase(),
  spatialModeLower: sound.spatialMode.toLowerCase(),
  bindingKeyLower: sound.auroraUsage.bindingKey.toLowerCase(),
  sourceFieldLower: sound.auroraUsage.sourceField.toLowerCase(),
  defaultsTableLower: sound.auroraUsage.defaultsTable?.toLowerCase() ?? null,
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
    const normalizedFormat = query.format?.toLowerCase().trim();
    const normalizedSpatialMode = query.spatialMode?.toLowerCase().trim();
    const normalizedBindingKey = query.bindingKey?.toLowerCase().trim();
    const normalizedSourceField = query.sourceField?.toLowerCase().trim();
    const normalizedDefaultsTable = query.defaultsTable?.toLowerCase().trim();
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
        if (!query.format) {
          return true;
        }
        return sound.formatLower === normalizedFormat;
      })
      .filter((sound) => {
        if (!query.spatialMode) {
          return true;
        }
        return sound.spatialModeLower === normalizedSpatialMode;
      })
      .filter((sound) => {
        if (!query.bindingKey) {
          return true;
        }
        return sound.bindingKeyLower === normalizedBindingKey;
      })
      .filter((sound) => {
        if (!query.sourceField) {
          return true;
        }
        return sound.sourceFieldLower === normalizedSourceField;
      })
      .filter((sound) => {
        if (!query.defaultsTable) {
          return true;
        }
        return sound.defaultsTableLower === normalizedDefaultsTable;
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
    format: sound.format,
    tags: sound.tags,
    benchmark: sound.benchmark,
    previewWaveformUrl: sound.previewWaveformUrl,
    spatialMode: sound.spatialMode,
    playbackMode: sound.playback.mode,
    source: {
      layer: resolveSoundSourceLayer(sound.sourceObjectKey)
    },
    auroraUsage: sound.auroraUsage,
    metrics: sound.metrics,
    updatedAt: sound.updatedAt
  };
}

function resolveSoundSourceLayer(objectKey: string): SoundSourceLayer {
  const normalizedKey = objectKey.replace(/\\/gu, "/").toLowerCase();
  if (normalizedKey.includes("/__aurora/sources/vanilla/")) {
    return "vanilla";
  }
  if (normalizedKey.includes("/__aurora/sources/hak/")) {
    return "hak";
  }
  if (normalizedKey.startsWith("modules/current/") || normalizedKey.includes("/__aurora/sources/module/")) {
    return "module";
  }
  return "other";
}

function buildSoundSearchableText(sound: SoundRecord): string {
  return [sound.name, sound.soundId, sound.resref, ...sound.tags].join("|").toLowerCase();
}

function buildStaticSound(input: Omit<SoundRecord, "reverseMapping">): SoundRecord {
  return {
    ...input,
    reverseMapping: {
      ...DEFAULT_REVERSE_MAPPING,
      palette: input.sourceObjectKey.includes("/hak/") ? "soundpalcus.itp" : "soundpalstd"
    }
  };
}
