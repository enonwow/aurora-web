import { AppConfigService } from "../../src/common/config/app-config.service";
import { MemorySoundProcessingCacheRepository } from "../../src/modules/sounds/adapters/outbound/memory/memory-sound-processing-cache.repository";
import type { SoundProcessingResult } from "../../src/modules/sounds/domain/sound.types";

describe("MemorySoundProcessingCacheRepository", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("evicts least recently used entries when max size is exceeded", async () => {
    const repository = new MemorySoundProcessingCacheRepository(createConfig(2, 900, 1048576));

    await repository.set("a", buildSoundResult("a"));
    await repository.set("b", buildSoundResult("b"));
    await repository.set("c", buildSoundResult("c"));

    expect(await repository.get("a")).toBeNull();
    expect(await repository.get("b")).toMatchObject({ value: { soundId: "b" } });
    expect(await repository.get("c")).toMatchObject({ value: { soundId: "c" } });
  });

  it("expires entries after ttl", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-25T00:00:00.000Z"));
    const repository = new MemorySoundProcessingCacheRepository(createConfig(2000, 1, 1048576));

    await repository.set("ttl-key", buildSoundResult("ttl"));
    jest.advanceTimersByTime(1100);

    expect(await repository.get("ttl-key")).toBeNull();
  });

  it("skips storing oversized entries", async () => {
    const repository = new MemorySoundProcessingCacheRepository(createConfig(2000, 900, 64));
    const oversized = buildSoundResult("oversized");
    oversized.tags = ["x".repeat(500)];

    await repository.set("big-key", oversized);

    expect(await repository.get("big-key")).toBeNull();
  });
});

function createConfig(
  processingCacheL1CatalogMaxEntries: number,
  processingCacheL1TtlSeconds: number,
  processingCacheL1CatalogMaxEntryBytes: number
): AppConfigService {
  return {
    processingCacheL1CatalogMaxEntries,
    processingCacheL1TtlSeconds,
    processingCacheL1CatalogMaxEntryBytes
  } as AppConfigService;
}

function buildSoundResult(soundId: string): SoundProcessingResult {
  return {
    soundId,
    resref: `res_${soundId}`,
    name: `Sound ${soundId}`,
    category: "effect",
    tags: [],
    benchmark: false,
    previewWaveformUrl: "/preview.webp",
    audio: {
      assetId: "audio/effects/test",
      cacheKey: "audio/effects/test:sound",
      strategy: "blob-cache",
      format: "wav",
      sampleRateHz: 44100,
      channels: 1
    },
    spatial: {
      mode: "3d",
      loop: false
    },
    metrics: {
      durationMs: 1000,
      cues: 1,
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
}
