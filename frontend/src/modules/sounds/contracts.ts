export type SoundApiCategory = "ambient" | "music" | "effect";
export type SoundApiSpatialMode = "2d" | "3d";
export type SoundApiFormat = "wav" | "ogg" | "bmu" | "mp3";
export type SoundApiPlaybackMode = "looping" | "continuous" | "random" | "interval";
export type SoundApiDeliveryMode = "proxy" | "direct";
export type SoundApiSourceLayer = "vanilla" | "hak" | "module" | "other";

export type SoundApiAreaBindingKey = "GI_sound_area" | "GI_sound_rndm" | "GI_sound_pos";
export type SoundApiAreaSourceField =
  | "AmbientSoundDay"
  | "AmbientSoundNight"
  | "MusicDay"
  | "MusicNight"
  | "MusicBattle"
  | "PlacedSound"
  | "RandomSound";

export interface SoundApiMetrics {
  durationMs: number;
  cues: number;
  emitters: number;
}

export interface SoundApiAuroraUsageHint {
  bindingKey: SoundApiAreaBindingKey;
  sourceField: SoundApiAreaSourceField;
  defaultsTable?: "sounddefaultstim" | "sounddefaultspos";
}

export interface SoundApiListQuery {
  query?: string;
  category?: SoundApiCategory;
  format?: SoundApiFormat;
  spatialMode?: SoundApiSpatialMode;
  tag?: string;
  bindingKey?: SoundApiAreaBindingKey;
  sourceField?: SoundApiAreaSourceField;
  benchmark?: boolean;
  limit?: number;
  offset?: number;
}

export interface SoundApiListItem {
  soundId: string;
  resref: string;
  name: string;
  category: SoundApiCategory;
  format: SoundApiFormat;
  tags: string[];
  benchmark: boolean;
  previewWaveformUrl: string;
  spatialMode: SoundApiSpatialMode;
  playbackMode: SoundApiPlaybackMode;
  source: {
    layer: SoundApiSourceLayer;
  };
  auroraUsage: SoundApiAuroraUsageHint;
  metrics: SoundApiMetrics;
  updatedAt: string;
}

export interface SoundApiListResult {
  items: SoundApiListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface SoundApiProcessPayload {
  bypassCache?: boolean;
}

export interface SoundApiProcessedSound {
  soundId: string;
  resref: string;
  name: string;
  category: SoundApiCategory;
  tags: string[];
  benchmark: boolean;
  previewWaveformUrl: string;
  audio: {
    assetId: string;
    cacheKey: string;
    strategy: "blob-cache";
    objectKey: string;
    contentType: string;
    sizeBytes: number;
    etag?: string;
    format: SoundApiFormat;
    sampleRateHz: number;
    channels: 1 | 2;
  };
  spatial: {
    mode: SoundApiSpatialMode;
    loop: boolean;
  };
  playback: {
    mode: SoundApiPlaybackMode;
    intervalSeconds?: number;
    ambientOnly: boolean;
  };
  auroraUsage: SoundApiAuroraUsageHint;
  metrics: SoundApiMetrics;
  render: {
    backendType: "sound";
    frontendType: "sound";
    playbackPreset: "ambient-loop" | "music-stream" | "effect-spatial";
  };
  updatedAt: string;
  processedAt: string;
}

export interface SoundApiProcessResult {
  cacheKey: string;
  cacheHit: boolean;
  storedAt: string;
  hits: number;
  sound: SoundApiProcessedSound;
}

export interface SoundApiAudioDeliveryContract {
  mode: SoundApiDeliveryMode;
  assetId: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  etag?: string;
  proxyPath: string;
  proxyUrl: string;
  directUrl?: string;
  s3Url?: string;
}

export interface SoundApiAudioContractsResult {
  cacheKey: string;
  audio: SoundApiAudioDeliveryContract;
}
