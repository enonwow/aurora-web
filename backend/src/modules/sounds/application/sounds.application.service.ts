import { Inject, Injectable, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { executeInFlight } from "../../../common/async/in-flight.helpers";
import {
  buildBlobObjectHttpUrl,
  buildS3ObjectUrl
} from "../../../common/blob/blob-url.helpers";
import { AppException } from "../../../common/http/app-exception";
import { AppConfigService } from "../../../common/config/app-config.service";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobObjectPayload,
  type ModuleBlobStoragePort
} from "../../runtime-settings/application/ports/module-blob-storage.port";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "../../runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../runtime-settings/domain/runtime-settings.types";
import {
  COMMITTED_MODULE_SNAPSHOT_READER,
  type CommittedModuleSnapshotReaderPort,
} from "../../module-snapshots/application/ports/committed-module-snapshot-reader.port";
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
  SoundDeliveryMode,
  SoundListQuery,
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

export interface SoundAudioBlobEnvelope {
  cacheKey: string;
  audio: SoundProcessingResult["audio"];
  payload: ModuleBlobObjectPayload;
}

export interface SoundAudioDeliveryContract {
  mode: SoundDeliveryMode;
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

export interface SoundAudioDeliveryEnvelope {
  cacheKey: string;
  audio: SoundAudioDeliveryContract;
}

@Injectable()
export class SoundsApplicationService {
  private readonly inFlightSoundProcessing = new Map<string, Promise<SoundProcessingEnvelope>>();

  constructor(
    @Inject(SOUND_REPOSITORY)
    private readonly repository: SoundRepositoryPort,
    @Inject(SOUND_PROCESSING_CACHE)
    private readonly processingCache: SoundProcessingCachePort,
    private readonly appConfig?: AppConfigService,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository?: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage?: ModuleBlobStoragePort,
    @Optional() @Inject(COMMITTED_MODULE_SNAPSHOT_READER)
    private readonly committedSnapshotReader?: CommittedModuleSnapshotReaderPort,
  ) {}

  listSounds(query: SoundListQuery) {
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
        objectKey: sound.sourceObjectKey,
        contentType: sound.sourceContentType,
        sizeBytes: sound.sourceSizeBytes,
        etag: sound.sourceEtag,
        format: sound.format,
        sampleRateHz: sound.sampleRateHz,
        channels: sound.channels
      },
      spatial: {
        mode: sound.spatialMode,
        loop: sound.loop
      },
      playback: sound.playback,
      auroraUsage: sound.auroraUsage,
      reverseMapping: sound.reverseMapping,
      source: {
        fingerprint: sound.sourceFingerprint,
        objectKey: sound.sourceObjectKey,
        contentType: sound.sourceContentType,
        sizeBytes: sound.sourceSizeBytes,
        etag: sound.sourceEtag
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
      playbackMode: sound.playback.mode,
      auroraBindingKey: sound.auroraUsage.bindingKey,
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
        const hydrated = await this.ensureSoundSource(cacheKey, cached.value);
        return {
          cache: {
            key: cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          sound: hydrated
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
          objectKey: sound.sourceObjectKey,
          contentType: sound.sourceContentType,
          sizeBytes: sound.sourceSizeBytes,
          etag: sound.sourceEtag,
          format: sound.format,
          sampleRateHz: sound.sampleRateHz,
          channels: sound.channels
        },
        spatial: {
          mode: sound.spatialMode,
          loop: sound.loop
        },
        playback: sound.playback,
        auroraUsage: sound.auroraUsage,
        reverseMapping: sound.reverseMapping,
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
      : executeInFlight(this.inFlightSoundProcessing, cacheKey, processMiss);
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

    const hydrated = await this.ensureSoundSource(cacheKey, cached.value);
    return {
      cache: {
        key: cacheKey,
        hit: true,
        storedAt: cached.storedAt,
        hits: cached.hits
      },
      sound: hydrated
    };
  }

  async getProcessedSoundAudio(cacheKey: string): Promise<SoundAudioBlobEnvelope> {
    const cached = await this.processingCache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "SOUND_CACHE_NOT_FOUND",
        message: "Sound cache entry was not found."
      });
    }

    const hydrated = await this.ensureSoundSource(cacheKey, cached.value);
    const payload = await this.readModuleBlobObject(hydrated.audio.objectKey);
    if (!payload) {
      throw new AppException({
        status: 404,
        code: "SOUND_AUDIO_BLOB_NOT_FOUND",
        message: "Sound audio blob object was not found."
      });
    }

    return {
      cacheKey,
      audio: hydrated.audio,
      payload: toBrowserFriendlySoundAudioPayload(payload)
    };
  }

  async getProcessedSoundAudioDelivery(
    cacheKey: string,
    mode: SoundDeliveryMode
  ): Promise<SoundAudioDeliveryEnvelope> {
    const cached = await this.processingCache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "SOUND_CACHE_NOT_FOUND",
        message: "Sound cache entry was not found."
      });
    }

    const hydrated = await this.ensureSoundSource(cacheKey, cached.value);
    const blobSettings = await this.getBlobStorageSettings();
    if (mode === "direct" && !blobSettings) {
      throw new AppException({
        status: 422,
        code: "SOUND_DIRECT_DELIVERY_UNAVAILABLE",
        message: "Direct sound delivery is unavailable without blob storage settings."
      });
    }
    const proxyPath = buildSoundAudioDeliveryPath(cacheKey);

    return {
      cacheKey,
      audio: {
        mode,
        assetId: hydrated.audio.assetId,
        objectKey: hydrated.audio.objectKey,
        contentType: hydrated.audio.contentType,
        sizeBytes: hydrated.audio.sizeBytes,
        etag: hydrated.audio.etag,
        proxyPath,
        proxyUrl: proxyPath,
        directUrl:
          mode === "direct" && blobSettings
            ? buildBlobObjectHttpUrl(blobSettings, hydrated.audio.objectKey)
            : undefined,
        s3Url: blobSettings ? buildS3ObjectUrl(blobSettings.bucket, hydrated.audio.objectKey) : undefined
      }
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

  private async ensureSoundSource(
    cacheKey: string,
    value: SoundProcessingResult
  ): Promise<SoundProcessingResult> {
    if (value.audio.objectKey && value.audio.contentType && value.audio.sizeBytes > 0) {
      return value;
    }

    const sound = await this.repository.findById(value.soundId);
    if (!sound) {
      return value;
    }

    const refreshed: SoundProcessingResult = {
      ...value,
      audio: {
        ...value.audio,
        objectKey: sound.sourceObjectKey,
        contentType: sound.sourceContentType,
        sizeBytes: sound.sourceSizeBytes,
        etag: sound.sourceEtag
      },
      playback: sound.playback,
      auroraUsage: sound.auroraUsage,
      reverseMapping: sound.reverseMapping
    };

    await this.processingCache.set(cacheKey, refreshed);
    return refreshed;
  }

  private async readModuleBlobObject(key: string): Promise<ModuleBlobObjectPayload | null> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage) {
      return null;
    }

    if (this.appConfig?.isTest && !this.appConfig.enableBlobAssetLookupInTest) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    return this.committedSnapshotReader
      ? (await this.committedSnapshotReader.capture()).getModuleObject(key)
      : this.moduleBlobStorage.getModuleObject(settings.blobStorage, key);
  }

  private async getBlobStorageSettings(): Promise<BlobStorageSettings | null> {
    if (!this.runtimeSettingsRepository) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    return settings.blobStorage;
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

function buildSoundAudioDeliveryPath(cacheKey: string): string {
  const encodedCacheKey = encodeURIComponent(cacheKey);
  return `/api/v1/catalog/sounds/cache/${encodedCacheKey}/audio`;
}

function toBrowserFriendlySoundAudioPayload(payload: ModuleBlobObjectPayload): ModuleBlobObjectPayload {
  const pcmWav = transcodeImaAdpcmWavToPcmWav(payload.bytes);
  if (!pcmWav) {
    return payload;
  }

  return {
    ...payload,
    size: pcmWav.length,
    contentType: "audio/wav",
    etag: createHash("sha256").update(pcmWav).digest("hex"),
    bytes: pcmWav
  };
}

interface WavChunk {
  id: string;
  start: number;
  size: number;
}

interface ImaAdpcmFormat {
  channels: number;
  sampleRate: number;
  blockAlign: number;
  bitsPerSample: number;
}

const IMA_ADPCM_FORMAT = 17;
const PCM_FORMAT = 1;
const IMA_INDEX_TABLE = [-1, -1, -1, -1, 2, 4, 6, 8] as const;
const IMA_STEP_TABLE = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17,
  19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
  50, 55, 60, 66, 73, 80, 88, 97, 107, 118,
  130, 143, 157, 173, 190, 209, 230, 253, 279, 307,
  337, 371, 408, 449, 494, 544, 598, 658, 724, 796,
  876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066,
  2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358,
  5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899,
  15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767
] as const;

function transcodeImaAdpcmWavToPcmWav(wav: Buffer): Buffer | null {
  if (wav.length < 44 || wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") {
    return null;
  }

  const chunks = readWavChunks(wav);
  const fmtChunk = chunks.find((chunk) => chunk.id === "fmt ");
  const dataChunk = chunks.find((chunk) => chunk.id === "data");
  if (!fmtChunk || !dataChunk || fmtChunk.size < 20) {
    return null;
  }

  const format = readImaAdpcmFormat(wav, fmtChunk);
  if (
    !format ||
    format.channels < 1 ||
    format.channels > 2 ||
    format.bitsPerSample !== 4 ||
    format.blockAlign <= format.channels * 4 ||
    dataChunk.start + dataChunk.size > wav.length
  ) {
    return null;
  }

  const factChunk = chunks.find((chunk) => chunk.id === "fact");
  const expectedSamples =
    factChunk && factChunk.size >= 4 && factChunk.start + 4 <= wav.length
      ? wav.readUInt32LE(factChunk.start)
      : undefined;
  const samples = decodeImaAdpcmBlocks(
    wav.subarray(dataChunk.start, dataChunk.start + dataChunk.size),
    format,
    expectedSamples
  );
  if (samples.length === 0) {
    return null;
  }

  return buildPcm16Wav(samples, format.sampleRate, format.channels);
}

function readWavChunks(wav: Buffer): WavChunk[] {
  const chunks: WavChunk[] = [];
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > wav.length) {
      break;
    }
    chunks.push({ id, start, size });
    offset = start + size + (size % 2);
  }
  return chunks;
}

function readImaAdpcmFormat(wav: Buffer, chunk: WavChunk): ImaAdpcmFormat | null {
  if (chunk.start + 20 > wav.length || wav.readUInt16LE(chunk.start) !== IMA_ADPCM_FORMAT) {
    return null;
  }

  return {
    channels: wav.readUInt16LE(chunk.start + 2),
    sampleRate: wav.readUInt32LE(chunk.start + 4),
    blockAlign: wav.readUInt16LE(chunk.start + 12),
    bitsPerSample: wav.readUInt16LE(chunk.start + 14)
  };
}

function decodeImaAdpcmBlocks(data: Buffer, format: ImaAdpcmFormat, expectedFrames?: number): number[] {
  const samples: number[] = [];
  const frameLimit = expectedFrames && expectedFrames > 0 ? expectedFrames : Number.POSITIVE_INFINITY;
  let frames = 0;

  for (
    let blockStart = 0;
    blockStart + format.channels * 4 <= data.length && frames < frameLimit;
    blockStart += format.blockAlign
  ) {
    const blockEnd = Math.min(blockStart + format.blockAlign, data.length);
    const states = Array.from({ length: format.channels }, (_, channel) => ({
      sample: clampPcmSample(data.readInt16LE(blockStart + channel * 4)),
      index: clampImaIndex(data.readUInt8(blockStart + channel * 4 + 2))
    }));
    pushImaFrame(samples, states);
    frames += 1;

    const encodedStart = blockStart + format.channels * 4;
    if (format.channels === 1) {
      for (let offset = encodedStart; offset < blockEnd && frames < frameLimit; offset += 1) {
        for (const nibble of readImaByteNibbles(data.readUInt8(offset))) {
          if (frames >= frameLimit) {
            break;
          }
          decodeImaNibbleIntoState(nibble, states[0]);
          pushImaFrame(samples, states);
          frames += 1;
        }
      }
      continue;
    }

    const packetSize = format.channels * 4;
    for (let groupStart = encodedStart; groupStart + packetSize <= blockEnd && frames < frameLimit; groupStart += packetSize) {
      const decodedPackets = states.map((state, channel) => {
        const channelSamples: number[] = [];
        const packetStart = groupStart + channel * 4;
        for (let offset = packetStart; offset < packetStart + 4; offset += 1) {
          for (const nibble of readImaByteNibbles(data.readUInt8(offset))) {
            decodeImaNibbleIntoState(nibble, state);
            channelSamples.push(state.sample);
          }
        }
        return channelSamples;
      });

      for (let frame = 0; frame < 8 && frames < frameLimit; frame += 1) {
        for (let channel = 0; channel < format.channels; channel += 1) {
          samples.push(decodedPackets[channel][frame] ?? states[channel].sample);
        }
        frames += 1;
      }
    }
  }

  return samples;
}

function pushImaFrame(samples: number[], states: Array<{ sample: number; index: number }>) {
  states.forEach((state) => samples.push(state.sample));
}

function readImaByteNibbles(byte: number): [number, number] {
  return [byte & 0x0f, byte >> 4];
}

function decodeImaNibbleIntoState(nibble: number, state: { sample: number; index: number }) {
  const decoded = decodeImaNibble(nibble, state.sample, state.index);
  state.sample = decoded.sample;
  state.index = decoded.index;
}

function decodeImaNibble(nibble: number, previousSample: number, previousIndex: number) {
  const step = IMA_STEP_TABLE[previousIndex] ?? IMA_STEP_TABLE[0];
  let diff = step >> 3;
  if ((nibble & 0x01) !== 0) {
    diff += step >> 2;
  }
  if ((nibble & 0x02) !== 0) {
    diff += step >> 1;
  }
  if ((nibble & 0x04) !== 0) {
    diff += step;
  }

  const sample = clampPcmSample((nibble & 0x08) !== 0 ? previousSample - diff : previousSample + diff);
  const index = clampImaIndex(previousIndex + (IMA_INDEX_TABLE[nibble & 0x07] ?? 0));
  return { sample, index };
}

function buildPcm16Wav(samples: number[], sampleRate: number, channels: number): Buffer {
  const dataSize = samples.length * 2;
  const output = Buffer.alloc(44 + dataSize);
  output.write("RIFF", 0, "ascii");
  output.writeUInt32LE(36 + dataSize, 4);
  output.write("WAVE", 8, "ascii");
  output.write("fmt ", 12, "ascii");
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(PCM_FORMAT, 20);
  output.writeUInt16LE(channels, 22);
  output.writeUInt32LE(sampleRate, 24);
  output.writeUInt32LE(sampleRate * channels * 2, 28);
  output.writeUInt16LE(channels * 2, 32);
  output.writeUInt16LE(16, 34);
  output.write("data", 36, "ascii");
  output.writeUInt32LE(dataSize, 40);
  samples.forEach((sample, index) => output.writeInt16LE(clampPcmSample(sample), 44 + index * 2));
  return output;
}

function clampPcmSample(value: number): number {
  return Math.max(-32768, Math.min(32767, value));
}

function clampImaIndex(value: number): number {
  return Math.max(0, Math.min(88, value));
}

export const __soundsApplicationServiceInternals = {
  buildBenchmarkFingerprint,
  summarizeDurations,
  percentile,
  buildBlobObjectHttpUrl,
  transcodeImaAdpcmWavToPcmWav
} as const;
