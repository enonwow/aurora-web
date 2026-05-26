export type SoundCategory = "ambient" | "music" | "effect";
export type SoundSpatialMode = "2d" | "3d";
export type SoundFormat = "wav" | "ogg";
export type SoundPlaybackMode = "looping" | "continuous" | "random" | "interval";
export type SoundDeliveryMode = "proxy" | "direct";

export interface SoundMetrics {
  durationMs: number;
  cues: number;
  emitters: number;
}

export interface SoundAreaBinding {
  areaKey: "GI_sound_area";
  randomKey: "GI_sound_rndm";
  positionalKey: "GI_sound_pos";
}

export interface SoundReverseMapping {
  palette: "soundpalstd" | "soundpalcus.itp";
  soundPalette: "soundpal";
  soundSetTable: "soundset";
  soundSetTypeTable: "soundsettype";
  soundTypesTable: "soundtypes";
  categoryFilterTable: "soundcatfilters";
  areaBinding: SoundAreaBinding;
}

export interface SoundRecord {
  soundId: string;
  resref: string;
  name: string;
  category: SoundCategory;
  tags: string[];
  benchmark: boolean;
  previewWaveformUrl: string;
  audioAssetId: string;
  sourceObjectKey: string;
  sourceContentType: string;
  sourceSizeBytes: number;
  sourceEtag?: string;
  sourceFingerprint: string;
  format: SoundFormat;
  sampleRateHz: number;
  channels: 1 | 2;
  spatialMode: SoundSpatialMode;
  loop: boolean;
  playback: {
    mode: SoundPlaybackMode;
    intervalSeconds?: number;
    ambientOnly: boolean;
  };
  reverseMapping: SoundReverseMapping;
  metrics: SoundMetrics;
  updatedAt: string;
}

export interface SoundListItem {
  soundId: string;
  resref: string;
  name: string;
  category: SoundCategory;
  tags: string[];
  benchmark: boolean;
  previewWaveformUrl: string;
  spatialMode: SoundSpatialMode;
  metrics: SoundMetrics;
  updatedAt: string;
}

export interface SoundListQuery {
  query?: string;
  category?: SoundCategory;
  tag?: string;
  benchmark?: boolean;
  limit: number;
  offset: number;
}

export interface SoundListResult {
  items: SoundListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface SoundProcessQuery {
  soundId: string;
  bypassCache: boolean;
}

export interface SoundProcessingResult {
  soundId: string;
  resref: string;
  name: string;
  category: SoundCategory;
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
    format: SoundFormat;
    sampleRateHz: number;
    channels: 1 | 2;
  };
  spatial: {
    mode: SoundSpatialMode;
    loop: boolean;
  };
  playback: {
    mode: SoundPlaybackMode;
    intervalSeconds?: number;
    ambientOnly: boolean;
  };
  reverseMapping: SoundReverseMapping;
  metrics: SoundMetrics;
  render: {
    backendType: "sound";
    frontendType: "sound";
    playbackPreset: "ambient-loop" | "music-stream" | "effect-spatial";
  };
  updatedAt: string;
  processedAt: string;
}

export interface SoundBenchmarkRunQuery {
  soundIds?: string[];
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

export interface SoundBenchmarkResult {
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
      soundId: string;
      resref: string;
      metrics: BenchmarkDurationSummary;
    }>;
  };
}
