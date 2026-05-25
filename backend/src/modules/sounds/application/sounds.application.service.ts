import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { AppException } from "../../../common/http/app-exception";
import {
  SOUND_PROCESSING_CACHE,
  type SoundProcessingCachePort
} from "./ports/sound-processing-cache.port";
import {
  SOUND_REPOSITORY,
  type SoundRepositoryPort
} from "./ports/sound-repository.port";
import type {
  BenchmarkDurationSummary,
  SoundBenchmarkResult,
  SoundBenchmarkRunQuery,
  SoundProcessQuery,
  SoundProcessingResult,
  SoundRecord
} from "../domain/sound.types";
import { buildSoundPlaybackPreset, buildSoundProcessCacheKey } from "../domain/sound-processing.builders";

export interface SoundProcessingEnvelope {
  cache: {
    key: string;
    hit: boolean;
    storedAt: string;
    hits: number;
  };
  sound: SoundProcessingResult;
}

@Injectable()
export class SoundsApplicationService {
  private readonly inFlightSoundProcessing = new Map<string, Promise<SoundProcessingEnvelope>>();

  constructor(
    @Inject(SOUND_REPOSITORY)
    private readonly repository: SoundRepositoryPort,
    @Inject(SOUND_PROCESSING_CACHE)
    private readonly processingCache: SoundProcessingCachePort
  ) {}

  listSounds(query: {
    query?: string;
    category?: "ambient" | "music" | "effect";
    tag?: string;
    benchmark?: boolean;
    limit: number;
    offset: number;
  }) {
    return this.repository.list(query);
  }

  async getSound(soundId: string) {
    const sound = await this.repository.findById(soundId);
    if (!sound) {
      throw new AppException({
        status: 404,
        code: "SOUND_NOT_FOUND",
        message: "Sound was not found."
      });
    }

    return {
      soundId: sound.soundId,
      resref: sound.resref,
      name: sound.name,
      category: sound.category,
      tags: sound.tags,
      benchmark: sound.benchmark,
      previewWaveformUrl: sound.previewWaveformUrl,
      audio: {
        assetId: sound.audioAssetId,
        cacheKey: `${sound.audioAssetId}:${sound.soundId}`,
        strategy: "blob-cache" as const,
        format: sound.format,
        sampleRateHz: sound.sampleRateHz,
        channels: sound.channels
      },
      spatial: {
        mode: sound.spatialMode,
        loop: sound.loop
      },
      metrics: sound.metrics,
      updatedAt: sound.updatedAt
    };
  }

  async getSoundPreview(soundId: string) {
    const sound = await this.repository.findById(soundId);
    if (!sound) {
      throw new AppException({
        status: 404,
        code: "SOUND_NOT_FOUND",
        message: "Sound was not found."
      });
    }

    return {
      soundId: sound.soundId,
      resref: sound.resref,
      name: sound.name,
      previewWaveformUrl: sound.previewWaveformUrl,
      benchmark: sound.benchmark,
      category: sound.category,
      spatialMode: sound.spatialMode,
      metrics: sound.metrics,
      updatedAt: sound.updatedAt
    };
  }

  async processSound(query: SoundProcessQuery) {
    const sound = await this.resolveSoundRecord(query.soundId);
    const precomputed = await this.repository.getPrecomputedSoundProcessing?.(sound.soundId);
    const cacheKey = precomputed?.cacheKey ?? buildSoundProcessCacheKey(sound);

    if (!query.bypassCache) {
      const cached = await this.processingCache.get(cacheKey);
      if (cached) {
        return {
          cache: {
            key: cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          sound: cached.value
        };
      }
    }

    const processMiss = async (): Promise<SoundProcessingEnvelope> => {
      const playbackPreset = buildSoundPlaybackPreset(sound);
      const processed: SoundProcessingResult = {
        soundId: sound.soundId,
        resref: sound.resref,
        name: sound.name,
        category: sound.category,
        tags: sound.tags,
        benchmark: sound.benchmark,
        previewWaveformUrl: sound.previewWaveformUrl,
        audio: {
          assetId: sound.audioAssetId,
          cacheKey: `${sound.audioAssetId}:${sound.soundId}`,
          strategy: "blob-cache",
          format: sound.format,
          sampleRateHz: sound.sampleRateHz,
          channels: sound.channels
        },
        spatial: {
          mode: sound.spatialMode,
          loop: sound.loop
        },
        metrics: sound.metrics,
        render: {
          backendType: "sound",
          frontendType: "sound",
          playbackPreset
        },
        updatedAt: sound.updatedAt,
        processedAt: new Date().toISOString()
      };

      const stored = await this.processingCache.set(cacheKey, processed);
      return {
        cache: {
          key: cacheKey,
          hit: false,
          storedAt: stored.storedAt,
          hits: stored.hits
        },
        sound: processed
      };
    };

    return query.bypassCache
      ? processMiss()
      : this.executeInFlight(this.inFlightSoundProcessing, cacheKey, processMiss);
  }

  async getProcessedSound(cacheKey: string) {
    const cached = await this.processingCache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "SOUND_CACHE_NOT_FOUND",
        message: "Sound cache entry was not found."
      });
    }

    return {
      cache: {
        key: cacheKey,
        hit: true,
        storedAt: cached.storedAt,
        hits: cached.hits
      },
      sound: cached.value
    };
  }

  async benchmarkSounds(query: SoundBenchmarkRunQuery): Promise<SoundBenchmarkResult> {
    const candidates = await this.resolveBenchmarkCandidates(query.soundIds);
    const perCandidate: Array<{
      soundId: string;
      resref: string;
      metrics: BenchmarkDurationSummary;
    }> = [];
    const allDurations: number[] = [];
    const startedAt = new Date().toISOString();

    for (const candidate of candidates) {
      for (let warmup = 0; warmup < query.warmupIterations; warmup += 1) {
        await this.processSound({
          soundId: candidate.soundId,
          bypassCache: true
        });
      }

      const durations: number[] = [];
      for (let iteration = 0; iteration < query.iterations; iteration += 1) {
        const started = process.hrtime.bigint();
        await this.processSound({
          soundId: candidate.soundId,
          bypassCache: query.bypassCache
        });
        const ended = process.hrtime.bigint();
        const elapsedMs = Number(ended - started) / 1_000_000;
        durations.push(elapsedMs);
        allDurations.push(elapsedMs);
      }

      perCandidate.push({
        soundId: candidate.soundId,
        resref: candidate.resref,
        metrics: summarizeDurations(durations)
      });
    }

    const finishedAt = new Date().toISOString();
    return {
      datasetFingerprint: buildBenchmarkFingerprint(candidates, query),
      config: {
        iterations: query.iterations,
        warmupIterations: query.warmupIterations,
        bypassCache: query.bypassCache,
        candidates: candidates.length
      },
      timing: {
        startedAt,
        finishedAt
      },
      metrics: {
        overall: summarizeDurations(allDurations),
        perCandidate
      }
    };
  }

  private async resolveSoundRecord(soundId: string): Promise<SoundRecord> {
    const sound = await this.repository.findById(soundId);
    if (!sound) {
      throw new AppException({
        status: 404,
        code: "SOUND_NOT_FOUND",
        message: "Sound was not found."
      });
    }
    return sound;
  }

  private async resolveBenchmarkCandidates(soundIds?: string[]): Promise<SoundRecord[]> {
    if (soundIds && soundIds.length > 0) {
      const resolved = await Promise.all(soundIds.map((soundId) => this.repository.findById(soundId)));
      const candidates = resolved.filter((value): value is SoundRecord => Boolean(value));
      if (candidates.length !== soundIds.length) {
        throw new AppException({
          status: 422,
          code: "VALIDATION_FAILED",
          message: "Benchmark payload references unknown sound ids."
        });
      }
      return candidates;
    }

    const benchmarkList = await this.repository.list({
      benchmark: true,
      limit: 200,
      offset: 0
    });
    if (benchmarkList.items.length === 0) {
      throw new AppException({
        status: 422,
        code: "VALIDATION_FAILED",
        message: "No benchmark sounds are configured."
      });
    }

    const resolved = await Promise.all(
      benchmarkList.items.map((item) => this.repository.findById(item.soundId))
    );
    return resolved.filter((value): value is SoundRecord => Boolean(value));
  }

  private executeInFlight<T>(
    inFlight: Map<string, Promise<T>>,
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }

    const pending = operation().finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, pending);
    return pending;
  }
}

function buildBenchmarkFingerprint(candidates: SoundRecord[], query: SoundBenchmarkRunQuery): string {
  const hash = createHash("sha256");
  hash.update(
    JSON.stringify({
      soundIds: candidates.map((item) => item.soundId),
      iterations: query.iterations,
      warmupIterations: query.warmupIterations,
      bypassCache: query.bypassCache
    })
  );
  return hash.digest("hex");
}

function summarizeDurations(durations: number[]): BenchmarkDurationSummary {
  if (durations.length === 0) {
    return {
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0
    };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const minMs = sorted[0];
  const maxMs = sorted[sorted.length - 1];
  const avgMs = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return {
    minMs,
    maxMs,
    avgMs,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99)
  };
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
}

export const __soundsApplicationServiceInternals = {
  buildBenchmarkFingerprint,
  summarizeDurations,
  percentile
} as const;
