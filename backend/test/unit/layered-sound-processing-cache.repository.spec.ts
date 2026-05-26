import { AppConfigService } from "../../src/common/config/app-config.service";
import { LayeredSoundProcessingCacheRepository } from "../../src/modules/sounds/adapters/outbound/layered/layered-sound-processing-cache.repository";
import type {
  SoundProcessingCacheEntry,
  SoundProcessingCachePort
} from "../../src/modules/sounds/application/ports/sound-processing-cache.port";
import type { SoundProcessingResult } from "../../src/modules/sounds/domain/sound.types";

describe("LayeredSoundProcessingCacheRepository", () => {
  const key = "cache-key";
  const value: SoundProcessingResult = {
    soundId: "sound_1",
    resref: "sound_resref",
    name: "Sound",
    category: "effect",
    tags: ["a"],
    benchmark: false,
    previewWaveformUrl: "/preview.webp",
    audio: {
      assetId: "audio/effects/test",
      cacheKey: "audio/effects/test:sound_1",
      strategy: "blob-cache",
      objectKey: "modules/current/audio/effects/test.wav",
      contentType: "audio/wav",
      sizeBytes: 2048,
      etag: "etag-test",
      format: "wav",
      sampleRateHz: 44100,
      channels: 1
    },
    spatial: {
      mode: "3d",
      loop: false
    },
    playback: {
      mode: "random",
      ambientOnly: false
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
      }
    },
    metrics: {
      durationMs: 1200,
      cues: 2,
      emitters: 0
    },
    render: {
      backendType: "sound",
      frontendType: "sound",
      playbackPreset: "effect-spatial"
    },
    updatedAt: "2026-05-25T00:00:00.000Z",
    processedAt: "2026-05-25T00:00:01.000Z"
  };

  function createPortMock(): jest.Mocked<SoundProcessingCachePort> {
    return {
      get: jest.fn(),
      set: jest.fn()
    };
  }

  function createConfig(): AppConfigService {
    return {
      processingCacheL1AdmissionHits: 2,
      processingCacheL1AdmissionWindowSeconds: 300,
      processingCacheL1CatalogMaxEntries: 1200
    } as AppConfigService;
  }

  it("returns L1 hit without querying L2", async () => {
    const memoryCache = createPortMock();
    const s3Cache = createPortMock();
    const entry: SoundProcessingCacheEntry = {
      key,
      value,
      storedAt: "2026-05-25T00:00:00.000Z",
      hits: 3
    };
    memoryCache.get.mockResolvedValue(entry);

    const repository = new LayeredSoundProcessingCacheRepository(
      s3Cache as any,
      memoryCache as any,
      createConfig()
    );

    const result = await repository.get(key);

    expect(result).toEqual(entry);
    expect(s3Cache.get).not.toHaveBeenCalled();
  });

  it("does not hydrate L1 on first L2 hit", async () => {
    const memoryCache = createPortMock();
    const s3Cache = createPortMock();
    const entry: SoundProcessingCacheEntry = {
      key,
      value,
      storedAt: "2026-05-25T00:00:00.000Z",
      hits: 1
    };
    memoryCache.get.mockResolvedValue(null);
    s3Cache.get.mockResolvedValue(entry);

    const repository = new LayeredSoundProcessingCacheRepository(
      s3Cache as any,
      memoryCache as any,
      createConfig()
    );

    const result = await repository.get(key);

    expect(result).toEqual(entry);
    expect(memoryCache.set).not.toHaveBeenCalled();
  });

  it("hydrates L1 on second L2 hit for same key", async () => {
    const memoryCache = createPortMock();
    const s3Cache = createPortMock();
    const entry: SoundProcessingCacheEntry = {
      key,
      value,
      storedAt: "2026-05-25T00:00:00.000Z",
      hits: 1
    };
    memoryCache.get.mockResolvedValue(null);
    s3Cache.get.mockResolvedValue(entry);
    memoryCache.set.mockResolvedValue({
      ...entry,
      hits: 0
    });

    const repository = new LayeredSoundProcessingCacheRepository(
      s3Cache as any,
      memoryCache as any,
      createConfig()
    );

    await repository.get(key);
    await repository.get(key);

    expect(memoryCache.set).toHaveBeenCalledTimes(1);
    expect(memoryCache.set).toHaveBeenCalledWith(key, value);
  });
});
