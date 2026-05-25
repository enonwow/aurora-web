export type SoundCategory = "ambient" | "music" | "effect";
export type SoundSpatialMode = "2d" | "3d";
export type SoundFormat = "wav" | "ogg";

export interface SoundMetrics {
  durationMs: number;
  cues: number;
  emitters: number;
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
  format: SoundFormat;
  sampleRateHz: number;
  channels: 1 | 2;
  spatialMode: SoundSpatialMode;
  loop: boolean;
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
    format: SoundFormat;
    sampleRateHz: number;
    channels: 1 | 2;
  };
  spatial: {
    mode: SoundSpatialMode;
    loop: boolean;
  };
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
