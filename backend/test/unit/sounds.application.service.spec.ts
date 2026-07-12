import { AppException } from "../../src/common/http/app-exception";
import {
  SoundsApplicationService,
  __soundsApplicationServiceInternals
} from "../../src/modules/sounds/application/sounds.application.service";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { SoundProcessingCachePort } from "../../src/modules/sounds/application/ports/sound-processing-cache.port";
import type { SoundRepositoryPort } from "../../src/modules/sounds/application/ports/sound-repository.port";
import type { SoundListResult, SoundProcessingResult, SoundRecord } from "../../src/modules/sounds/domain/sound.types";

describe("SoundsApplicationService", () => {
  let repository: jest.Mocked<SoundRepositoryPort>;
  let processingCache: jest.Mocked<SoundProcessingCachePort>;
  let service: SoundsApplicationService;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      findById: jest.fn()
    };
    processingCache = {
      get: jest.fn(),
      set: jest.fn()
    };
    service = new SoundsApplicationService(repository, processingCache);
  });

  it("lists sounds through repository", async () => {
    const result: SoundListResult = {
      items: [
        {
          soundId: "sound_ambient_city_market_001",
          resref: "amb_city_market_day",
          name: "City Market Day Ambience",
          category: "ambient",
          format: "ogg",
          tags: ["city"],
          benchmark: true,
          previewWaveformUrl: "/preview.webp",
          spatialMode: "2d",
          playbackMode: "interval",
          source: {
            layer: "module"
          },
          auroraUsage: {
            bindingKey: "GI_sound_area",
            sourceField: "AmbientSoundDay"
          },
          metrics: {
            durationMs: 1000,
            cues: 1,
            emitters: 0
          },
          updatedAt: "2026-05-25T00:00:00.000Z"
        }
      ],
      total: 1,
      limit: 20,
      offset: 0
    };
    repository.list.mockResolvedValue(result);

    const response = await service.listSounds({
      category: "ambient",
      limit: 20,
      offset: 0
    });

    expect(repository.list).toHaveBeenCalledWith({
      category: "ambient",
      limit: 20,
      offset: 0
    });
    expect(response).toEqual(result);
    expect(response.items[0]?.source.layer).toBe("module");
  });

  it("returns full sound payload", async () => {
    repository.findById.mockResolvedValue(buildSound("sound_ambient_city_market_001"));

    const detail = await service.getSound("sound_ambient_city_market_001");

    expect(detail.soundId).toBe("sound_ambient_city_market_001");
    expect(detail.audio.assetId).toBe("audio/ambient/city-market-day");
    expect(detail.audio.cacheKey).toBe("audio/ambient/city-market-day:sound_ambient_city_market_001");
    expect(detail.audio.strategy).toBe("blob-cache");
    expect(detail.spatial).toEqual({
      mode: "2d",
      loop: true
    });
    expect(detail.metrics.durationMs).toBeGreaterThan(0);
  });

  it("returns lightweight sound preview payload", async () => {
    repository.findById.mockResolvedValue(buildSound("sound_ambient_city_market_001"));

    const preview = await service.getSoundPreview("sound_ambient_city_market_001");

    expect(preview.soundId).toBe("sound_ambient_city_market_001");
    expect(preview.category).toBe("ambient");
    expect(preview.spatialMode).toBe("2d");
  });

  it("throws SOUND_NOT_FOUND when sound is missing", async () => {
    repository.findById.mockResolvedValue(null);
    await expectSoundNotFound(service.getSound("missing"));
  });

  it("throws SOUND_NOT_FOUND in preview when sound is missing", async () => {
    repository.findById.mockResolvedValue(null);
    await expectSoundNotFound(service.getSoundPreview("missing"));
  });

  it("processes sound and stores cache payload on miss", async () => {
    repository.findById.mockResolvedValue(buildSound("sound_ambient_city_market_001"));
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));

    const result = await service.processSound({
      soundId: "sound_ambient_city_market_001",
      bypassCache: false
    });

    expect(result.cache.hit).toBe(false);
    expect(result.sound.soundId).toBe("sound_ambient_city_market_001");
    expect(result.sound.audio.cacheKey).toBe("audio/ambient/city-market-day:sound_ambient_city_market_001");
    expect(result.sound.render.backendType).toBe("sound");
    expect(result.sound.processedAt).toEqual(expect.any(String));
    expect(processingCache.set).toHaveBeenCalledTimes(1);
  });

  it("returns processSound cache hit when bypassCache=false and cache exists", async () => {
    const value = buildProcessedSoundResult("sound_ambient_city_market_001");
    repository.findById.mockResolvedValue(buildSound("sound_ambient_city_market_001"));
    processingCache.get.mockResolvedValue({
      key: "c".repeat(64),
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 6
    });

    const result = await service.processSound({
      soundId: "sound_ambient_city_market_001",
      bypassCache: false
    });

    expect(result.cache.hit).toBe(true);
    expect(result.cache.hits).toBe(6);
    expect(result.sound.soundId).toBe("sound_ambient_city_market_001");
    expect(processingCache.set).not.toHaveBeenCalled();
  });

  it("processSound bypassCache=true skips cache read and writes fresh payload", async () => {
    repository.findById.mockResolvedValue(buildSound("sound_ambient_city_market_001"));
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));

    const result = await service.processSound({
      soundId: "sound_ambient_city_market_001",
      bypassCache: true
    });

    expect(result.cache.hit).toBe(false);
    expect(processingCache.get).not.toHaveBeenCalled();
    expect(processingCache.set).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent sound processing misses by cache key", async () => {
    repository.findById.mockResolvedValue(buildSound("sound_ambient_city_market_001"));
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        key,
        value,
        storedAt: "2026-05-25T11:00:00.000Z",
        hits: 0
      };
    });

    const firstPromise = service.processSound({
      soundId: "sound_ambient_city_market_001",
      bypassCache: false
    });
    const secondPromise = service.processSound({
      soundId: "sound_ambient_city_market_001",
      bypassCache: false
    });

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(processingCache.set).toHaveBeenCalledTimes(1);
    expect(first.cache.key).toBe(second.cache.key);
    expect(first.sound.soundId).toBe("sound_ambient_city_market_001");
    expect(second.sound.soundId).toBe("sound_ambient_city_market_001");
  });

  it("cleans in-flight sound map after completion so subsequent same-key miss reprocesses", async () => {
    repository.findById.mockResolvedValue(buildSound("sound_ambient_city_market_001"));
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));

    await service.processSound({
      soundId: "sound_ambient_city_market_001",
      bypassCache: false
    });
    await service.processSound({
      soundId: "sound_ambient_city_market_001",
      bypassCache: false
    });

    expect(processingCache.set).toHaveBeenCalledTimes(2);
  });

  it("returns processed sound cache hit", async () => {
    const value = buildProcessedSoundResult("sound_ambient_city_market_001");
    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 3
    });

    const result = await service.getProcessedSound("a".repeat(64));

    expect(result.cache.hit).toBe(true);
    expect(result.cache.hits).toBe(3);
    expect(result.sound.soundId).toBe("sound_ambient_city_market_001");
  });

  it("throws SOUND_CACHE_NOT_FOUND when processed sound key is missing", async () => {
    processingCache.get.mockResolvedValue(null);

    await expect(service.getProcessedSound("b".repeat(64))).rejects.toMatchObject({
      code: "SOUND_CACHE_NOT_FOUND",
      message: "Sound cache entry was not found."
    });
  });

  it("returns processed sound audio payload from blob storage", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const serviceWithBlob = new SoundsApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const cached = buildProcessedSoundResult("sound_ambient_city_market_001");

    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 3
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: cached.audio.objectKey,
      size: cached.audio.sizeBytes,
      contentType: cached.audio.contentType,
      etag: cached.audio.etag,
      bytes: Buffer.from([0x01, 0x02, 0x03])
    });

    const result = await serviceWithBlob.getProcessedSoundAudio("a".repeat(64));

    expect(result.cacheKey).toBe("a".repeat(64));
    expect(result.audio.assetId).toBe(cached.audio.assetId);
    expect(result.payload.size).toBe(cached.audio.sizeBytes);
    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "aurora-module-assets"
      }),
      cached.audio.objectKey
    );
  });

  it("returns browser-friendly PCM WAV payload for mono IMA ADPCM WAV while preserving source metadata", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const serviceWithBlob = new SoundsApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const imaWav = buildMonoImaAdpcmWavFixture();
    const cached: SoundProcessingResult = {
      ...buildProcessedSoundResult("sound_ambient_city_market_001"),
      audio: {
        ...buildProcessedSoundResult("sound_ambient_city_market_001").audio,
        objectKey: "modules/current/__aurora/sources/vanilla/audio/wav/al_an_bees1.wav",
        contentType: "audio/wav",
        sizeBytes: imaWav.length,
        etag: "source-ima-etag",
        format: "wav",
        sampleRateHz: 8000,
        channels: 1
      }
    };

    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 3
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: cached.audio.objectKey,
      size: imaWav.length,
      contentType: "audio/wav",
      etag: "source-ima-etag",
      bytes: imaWav
    });

    const result = await serviceWithBlob.getProcessedSoundAudio("a".repeat(64));

    expect(result.audio.objectKey).toBe("modules/current/__aurora/sources/vanilla/audio/wav/al_an_bees1.wav");
    expect(result.audio.sizeBytes).toBe(imaWav.length);
    expect(result.audio.etag).toBe("source-ima-etag");
    expect(result.payload.key).toBe(cached.audio.objectKey);
    expect(result.payload.contentType).toBe("audio/wav");
    expect(result.payload.etag).not.toBe("source-ima-etag");
    expect(result.payload.bytes.toString("ascii", 0, 4)).toBe("RIFF");
    expect(result.payload.bytes.toString("ascii", 8, 12)).toBe("WAVE");
    expect(result.payload.bytes.readUInt16LE(20)).toBe(1);
    expect(result.payload.bytes.readUInt16LE(22)).toBe(1);
    expect(result.payload.bytes.readUInt32LE(24)).toBe(8000);
    expect(result.payload.bytes.readUInt16LE(34)).toBe(16);
    expect(result.payload.bytes.toString("ascii", 36, 40)).toBe("data");
    expect(result.payload.bytes.readUInt32LE(40)).toBe(18);
    expect(result.payload.bytes.readInt16LE(44)).toBe(1000);
  });

  it("returns browser-friendly PCM WAV payload for stereo IMA ADPCM WAV", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const serviceWithBlob = new SoundsApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const imaWav = buildStereoImaAdpcmWavFixture();
    const cached: SoundProcessingResult = {
      ...buildProcessedSoundResult("sound_ambient_city_market_001"),
      audio: {
        ...buildProcessedSoundResult("sound_ambient_city_market_001").audio,
        objectKey: "modules/current/__aurora/sources/vanilla/audio/files/amb/al_cv_caveamb1.wav",
        contentType: "audio/wav",
        sizeBytes: imaWav.length,
        etag: "source-stereo-ima-etag",
        format: "wav",
        sampleRateHz: 8000,
        channels: 2
      }
    };

    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 3
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: cached.audio.objectKey,
      size: imaWav.length,
      contentType: "audio/wav",
      etag: "source-stereo-ima-etag",
      bytes: imaWav
    });

    const result = await serviceWithBlob.getProcessedSoundAudio("a".repeat(64));

    expect(result.audio.objectKey).toBe("modules/current/__aurora/sources/vanilla/audio/files/amb/al_cv_caveamb1.wav");
    expect(result.audio.sizeBytes).toBe(imaWav.length);
    expect(result.payload.contentType).toBe("audio/wav");
    expect(result.payload.etag).not.toBe("source-stereo-ima-etag");
    expect(result.payload.bytes.toString("ascii", 0, 4)).toBe("RIFF");
    expect(result.payload.bytes.toString("ascii", 8, 12)).toBe("WAVE");
    expect(result.payload.bytes.readUInt16LE(20)).toBe(1);
    expect(result.payload.bytes.readUInt16LE(22)).toBe(2);
    expect(result.payload.bytes.readUInt32LE(24)).toBe(8000);
    expect(result.payload.bytes.readUInt16LE(34)).toBe(16);
    expect(result.payload.bytes.readUInt32LE(40)).toBe(36);
    expect(result.payload.bytes.readInt16LE(44)).toBe(1000);
    expect(result.payload.bytes.readInt16LE(46)).toBe(-1000);
  });

  it("builds proxy delivery contract for cached sound", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const serviceWithBlob = new SoundsApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const cached = buildProcessedSoundResult("sound_ambient_city_market_001");
    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 3
    });

    const result = await serviceWithBlob.getProcessedSoundAudioDelivery("a".repeat(64), "proxy");

    expect(result.audio.mode).toBe("proxy");
    expect(result.audio.proxyPath).toBe(`/api/v1/catalog/sounds/cache/${"a".repeat(64)}/audio`);
    expect(result.audio.s3Url).toBe(`s3://aurora-module-assets/${cached.audio.objectKey}`);
    expect(result.audio.directUrl).toBeUndefined();
  });

  it("builds direct delivery contract for cached sound", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const serviceWithBlob = new SoundsApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const cached = buildProcessedSoundResult("sound_ambient_city_market_001");
    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 3
    });

    const result = await serviceWithBlob.getProcessedSoundAudioDelivery("a".repeat(64), "direct");

    expect(result.audio.mode).toBe("direct");
    expect(result.audio.directUrl).toBe(
      `http://seaweedfs:8333/aurora-module-assets/${encodeURIComponent("modules")}/${encodeURIComponent("current")}/${encodeURIComponent("audio")}/${encodeURIComponent("ambient")}/${encodeURIComponent("amb_city_market_day.ogg")}`
    );
  });

  it("rejects direct delivery when blob settings are unavailable", async () => {
    const cached = buildProcessedSoundResult("sound_ambient_city_market_001");
    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 3
    });

    await expect(
      service.getProcessedSoundAudioDelivery("a".repeat(64), "direct")
    ).rejects.toMatchObject({
      code: "SOUND_DIRECT_DELIVERY_UNAVAILABLE"
    });
  });

  it("throws SOUND_NOT_FOUND from processSound when target sound is missing", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.processSound({
        soundId: "missing",
        bypassCache: true
      })
    ).rejects.toMatchObject({
      code: "SOUND_NOT_FOUND",
      message: "Sound was not found."
    });
  });

  it("runs benchmark and returns deterministic metrics envelope", async () => {
    const sound = buildSound("sound_ambient_city_market_001");
    repository.list.mockResolvedValue({
      items: [
        {
          soundId: sound.soundId,
          resref: sound.resref,
          name: sound.name,
          category: sound.category,
          format: sound.format,
          tags: sound.tags,
          benchmark: true,
          previewWaveformUrl: sound.previewWaveformUrl,
          spatialMode: sound.spatialMode,
          playbackMode: sound.playback.mode,
          source: {
            layer: "module"
          },
          auroraUsage: sound.auroraUsage,
          metrics: sound.metrics,
          updatedAt: sound.updatedAt
        }
      ],
      total: 1,
      limit: 200,
      offset: 0
    });
    repository.findById.mockResolvedValue(sound);
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));

    const result = await service.benchmarkSounds({
      iterations: 3,
      warmupIterations: 1,
      bypassCache: true
    });

    expect(result.datasetFingerprint).toHaveLength(64);
    expect(result.metrics.perCandidate).toHaveLength(1);
    expect(result.config.candidates).toBe(1);
  });

  it("benchmark uses provided sound ids without listing benchmark defaults", async () => {
    repository.findById.mockResolvedValue(buildSound("sound_ambient_city_market_001"));
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));

    await service.benchmarkSounds({
      soundIds: ["sound_ambient_city_market_001"],
      iterations: 1,
      warmupIterations: 0,
      bypassCache: true
    });

    expect(repository.list).not.toHaveBeenCalled();
    expect(repository.findById).toHaveBeenCalledWith("sound_ambient_city_market_001");
  });

  it("benchmark with empty soundIds uses benchmark list query", async () => {
    const sound = buildSound("sound_ambient_city_market_001");
    repository.list.mockResolvedValue({
      items: [
        {
          soundId: sound.soundId,
          resref: sound.resref,
          name: sound.name,
          category: sound.category,
          format: sound.format,
          tags: sound.tags,
          benchmark: true,
          previewWaveformUrl: sound.previewWaveformUrl,
          spatialMode: sound.spatialMode,
          playbackMode: sound.playback.mode,
          source: {
            layer: "module"
          },
          auroraUsage: sound.auroraUsage,
          metrics: sound.metrics,
          updatedAt: sound.updatedAt
        }
      ],
      total: 1,
      limit: 200,
      offset: 0
    });
    repository.findById.mockResolvedValue(sound);
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));

    await service.benchmarkSounds({
      soundIds: [],
      iterations: 1,
      warmupIterations: 0,
      bypassCache: true
    });

    expect(repository.list).toHaveBeenCalledWith({
      benchmark: true,
      limit: 200,
      offset: 0
    });
  });

  it("benchmark fails when no benchmark sounds are configured", async () => {
    repository.list.mockResolvedValue({
      items: [],
      total: 0,
      limit: 200,
      offset: 0
    });

    await expect(
      service.benchmarkSounds({
        iterations: 1,
        warmupIterations: 0,
        bypassCache: true
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "No benchmark sounds are configured."
    });
  });

  it("benchmark calls processSound exact warmup and iteration counts with expected flags", async () => {
    repository.findById.mockResolvedValue(buildSound("sound_ambient_city_market_001"));
    const processSpy = jest.spyOn(service, "processSound").mockResolvedValue({
      cache: {
        key: "k".repeat(64),
        hit: false,
        storedAt: "2026-05-25T11:00:00.000Z",
        hits: 0
      },
      sound: buildProcessedSoundResult("sound_ambient_city_market_001")
    });

    await service.benchmarkSounds({
      soundIds: ["sound_ambient_city_market_001"],
      iterations: 4,
      warmupIterations: 2,
      bypassCache: false
    });

    expect(processSpy).toHaveBeenCalledTimes(6);
    expect(processSpy.mock.calls[0][0]).toEqual({
      soundId: "sound_ambient_city_market_001",
      bypassCache: true
    });
    expect(processSpy.mock.calls[1][0]).toEqual({
      soundId: "sound_ambient_city_market_001",
      bypassCache: true
    });
    expect(processSpy.mock.calls[2][0]).toEqual({
      soundId: "sound_ambient_city_market_001",
      bypassCache: false
    });
    expect(processSpy.mock.calls[5][0]).toEqual({
      soundId: "sound_ambient_city_market_001",
      bypassCache: false
    });
  });

  it("benchmark computes elapsed milliseconds from hrtime deltas", async () => {
    repository.findById.mockResolvedValue(buildSound("sound_ambient_city_market_001"));
    const processSpy = jest.spyOn(service, "processSound").mockResolvedValue({
      cache: {
        key: "k".repeat(64),
        hit: false,
        storedAt: "2026-05-25T11:00:00.000Z",
        hits: 0
      },
      sound: buildProcessedSoundResult("sound_ambient_city_market_001")
    });
    const hrtimeSpy = jest
      .spyOn(process.hrtime, "bigint")
      .mockReturnValueOnce(1_000_000n)
      .mockReturnValueOnce(2_000_000n)
      .mockReturnValueOnce(10_000_000n)
      .mockReturnValueOnce(13_000_000n);

    const result = await service.benchmarkSounds({
      soundIds: ["sound_ambient_city_market_001"],
      iterations: 2,
      warmupIterations: 0,
      bypassCache: true
    });

    expect(processSpy).toHaveBeenCalledTimes(2);
    expect(result.metrics.overall.minMs).toBe(1);
    expect(result.metrics.overall.maxMs).toBe(3);
    expect(result.metrics.overall.avgMs).toBe(2);
    expect(result.metrics.perCandidate[0].metrics.p50Ms).toBe(1);
    expect(result.metrics.perCandidate[0].metrics.p95Ms).toBe(1);
    expect(result.metrics.perCandidate[0].metrics.p99Ms).toBe(1);
    hrtimeSpy.mockRestore();
  });

  it("benchmark fingerprint changes when sound candidate set changes", async () => {
    const soundA = buildSound("sound_ambient_city_market_001");
    const soundB = buildSound("sound_music_city_theme_002");
    repository.findById.mockImplementation(async (id) => {
      if (id === soundA.soundId) {
        return soundA;
      }
      if (id === soundB.soundId) {
        return soundB;
      }
      return null;
    });
    const processSpy = jest.spyOn(service, "processSound").mockResolvedValue({
      cache: {
        key: "k".repeat(64),
        hit: false,
        storedAt: "2026-05-25T11:00:00.000Z",
        hits: 0
      },
      sound: buildProcessedSoundResult("sound_ambient_city_market_001")
    });

    const first = await service.benchmarkSounds({
      soundIds: [soundA.soundId],
      iterations: 1,
      warmupIterations: 0,
      bypassCache: true
    });
    const second = await service.benchmarkSounds({
      soundIds: [soundB.soundId],
      iterations: 1,
      warmupIterations: 0,
      bypassCache: true
    });

    expect(processSpy).toHaveBeenCalledTimes(2);
    expect(first.datasetFingerprint).not.toBe(second.datasetFingerprint);
  });

  it("benchmark validation fails for unknown sound ids", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.benchmarkSounds({
        soundIds: ["missing-sound"],
        iterations: 1,
        warmupIterations: 0,
        bypassCache: true
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Benchmark payload references unknown sound ids."
    });
  });

  it("benchmark internals summarize empty durations as zero metrics", () => {
    const summary = __soundsApplicationServiceInternals.summarizeDurations([]);
    expect(summary).toEqual({
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0
    });
  });

  it("benchmark internals sort durations before percentile calculations", () => {
    const summary = __soundsApplicationServiceInternals.summarizeDurations([3, 1, 2]);
    expect(summary.minMs).toBe(1);
    expect(summary.maxMs).toBe(3);
    expect(summary.avgMs).toBe(2);
    expect(summary.p50Ms).toBe(2);
    expect(summary.p95Ms).toBe(2);
    expect(summary.p99Ms).toBe(2);
  });

  it("benchmark internals percentile clamps ratios outside [0,1]", () => {
    expect(__soundsApplicationServiceInternals.percentile([], 0.5)).toBe(0);
    expect(__soundsApplicationServiceInternals.percentile([1, 2, 3], -3)).toBe(1);
    expect(__soundsApplicationServiceInternals.percentile([1, 2, 3], 5)).toBe(3);
  });
});

function buildSound(soundId: string): SoundRecord {
  return {
    soundId,
    resref: "amb_city_market_day",
    name: "City Market Day Ambience",
    category: "ambient",
    tags: ["city", "market", "day", "crowd"],
    benchmark: true,
    previewWaveformUrl: `/previews/${soundId}.webp`,
    audioAssetId: "audio/ambient/city-market-day",
    sourceObjectKey: "modules/current/audio/ambient/amb_city_market_day.ogg",
    sourceContentType: "audio/ogg",
    sourceSizeBytes: 245760,
    sourceEtag: "test-etag",
    sourceFingerprint: "test-source-fingerprint",
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
    reverseMapping: {
      palette: "soundpalstd",
      soundPalette: "soundpal",
      soundSetTable: "soundset",
      soundSetTypeTable: "soundsettype",
      soundTypesTable: "soundtypes",
      categoryFilterTable: "soundcatfilters",
      areaBinding: {
        areaKey: "GI_sound_area",
        randomKey: "GI_sound_rndm",
        positionalKey: "GI_sound_pos"
      },
      soundDefaultsTimingTable: "sounddefaultstim",
      soundDefaultsPositionTable: "sounddefaultspos"
    },
    metrics: {
      durationMs: 32210,
      cues: 4,
      emitters: 0
    },
    updatedAt: "2026-05-25T00:00:00.000Z"
  };
}

function buildProcessedSoundResult(soundId: string): SoundProcessingResult {
  const sound = buildSound(soundId);
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
      playbackPreset: "ambient-loop"
    },
    updatedAt: sound.updatedAt,
    processedAt: "2026-05-25T10:59:00.000Z"
  };
}

async function expectSoundNotFound(promise: Promise<unknown>): Promise<void> {
  expect.assertions(4);
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppException);
    const appError = error as AppException;
    expect(appError.code).toBe("SOUND_NOT_FOUND");
    expect(appError.getStatus()).toBe(404);
    expect((appError.getResponse() as { message: string }).message).toBe("Sound was not found.");
  }
}

function buildMonoImaAdpcmWavFixture(): Buffer {
  const sampleRate = 8000;
  const blockAlign = 8;
  const samplesPerBlock = 9;
  const dataSize = blockAlign;
  const output = Buffer.alloc(60 + dataSize);

  output.write("RIFF", 0, "ascii");
  output.writeUInt32LE(output.length - 8, 4);
  output.write("WAVE", 8, "ascii");
  output.write("fmt ", 12, "ascii");
  output.writeUInt32LE(20, 16);
  output.writeUInt16LE(17, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(sampleRate, 24);
  output.writeUInt32LE(sampleRate * 4, 28);
  output.writeUInt16LE(blockAlign, 32);
  output.writeUInt16LE(4, 34);
  output.writeUInt16LE(2, 36);
  output.writeUInt16LE(samplesPerBlock, 38);
  output.write("fact", 40, "ascii");
  output.writeUInt32LE(4, 44);
  output.writeUInt32LE(samplesPerBlock, 48);
  output.write("data", 52, "ascii");
  output.writeUInt32LE(dataSize, 56);
  output.writeInt16LE(1000, 60);
  output.writeUInt8(0, 62);
  output.writeUInt8(0, 63);
  output.fill(0, 64);

  return output;
}

function buildStereoImaAdpcmWavFixture(): Buffer {
  const sampleRate = 8000;
  const channels = 2;
  const blockAlign = 16;
  const samplesPerBlock = 9;
  const dataSize = blockAlign;
  const output = Buffer.alloc(60 + dataSize);

  output.write("RIFF", 0, "ascii");
  output.writeUInt32LE(output.length - 8, 4);
  output.write("WAVE", 8, "ascii");
  output.write("fmt ", 12, "ascii");
  output.writeUInt32LE(20, 16);
  output.writeUInt16LE(17, 20);
  output.writeUInt16LE(channels, 22);
  output.writeUInt32LE(sampleRate, 24);
  output.writeUInt32LE(Math.floor((sampleRate * blockAlign) / samplesPerBlock), 28);
  output.writeUInt16LE(blockAlign, 32);
  output.writeUInt16LE(4, 34);
  output.writeUInt16LE(2, 36);
  output.writeUInt16LE(samplesPerBlock, 38);
  output.write("fact", 40, "ascii");
  output.writeUInt32LE(4, 44);
  output.writeUInt32LE(samplesPerBlock, 48);
  output.write("data", 52, "ascii");
  output.writeUInt32LE(dataSize, 56);
  output.writeInt16LE(1000, 60);
  output.writeUInt8(0, 62);
  output.writeUInt8(0, 63);
  output.writeInt16LE(-1000, 64);
  output.writeUInt8(0, 66);
  output.writeUInt8(0, 67);
  output.fill(0, 68);

  return output;
}

function createRuntimeSettingsRepository(): jest.Mocked<RuntimeSettingsRepositoryPort> {
  return {
    get: jest.fn().mockResolvedValue({
      revision: 1,
      updatedAt: "2026-05-25T00:00:00.000Z",
      updatedBy: "test",
      paths: {
        vanillaDataPath: "",
        hakDirectoryPath: "",
        moduleDecompiledPath: "",
        modulePackedPath: "",
        tlkBasePath: "",
        tlkCustomPath: ""
      },
      blobStorage: {
        endpoint: "http://seaweedfs:8333",
        region: "us-east-1",
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current",
        accessKeyId: "seaweedfs",
        secretAccessKey: "secret",
        forcePathStyle: true
      },
      telemetryDebugMode: "off",
      hakProfiles: {},
      sources: {
        placeable: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: false,
          includeVanilla: false,
          hakProfileId: "",
          hakPriorityList: []
        },
        tile: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: false,
          includeVanilla: false,
          hakProfileId: "",
          hakPriorityList: []
        },
        area: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: false,
          includeVanilla: false,
          hakProfileId: "",
          hakPriorityList: []
        },
        sound: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: false,
          includeVanilla: false,
          hakProfileId: "",
          hakPriorityList: []
        }
      },
      benchmarkCandidates: {
        placeableHeavyNoVfx: {
          resref: "",
          metrics: { triangles: 0, meshes: 0, emitters: 0 },
          context: { source: "test" }
        },
        placeableHeavyVfx: {
          resref: "",
          metrics: { triangles: 0, meshes: 0, emitters: 0 },
          context: { source: "test" }
        },
        placeableVfxPlcAlternative: {
          resref: "",
          metrics: { triangles: 0, meshes: 0, emitters: 0 },
          context: { source: "test" }
        },
        doorHeavyInstance: {
          resref: "",
          metrics: { triangles: 0, meshes: 0, emitters: 0 },
          context: { source: "test" }
        },
        doorHeavySingleMesh: {
          resref: "",
          metrics: { triangles: 0, meshes: 0, emitters: 0 },
          context: { source: "test" }
        }
      }
    }),
    save: jest.fn()
  };
}

function createModuleBlobStorage(): jest.Mocked<ModuleBlobStoragePort> {
  return {
    replaceModuleSnapshot: jest.fn(),
    listModuleSnapshot: jest.fn(),
    getModuleObject: jest.fn()
  };
}
