import { AppConfigService } from "../../src/common/config/app-config.service";
import { MemoryPlaceableProcessingCacheRepository } from "../../src/modules/catalog/adapters/outbound/memory/memory-placeable-processing-cache.repository";

describe("MemoryPlaceableProcessingCacheRepository", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("evicts least recently used entries when max size is exceeded", async () => {
    const repository = new MemoryPlaceableProcessingCacheRepository(
      createConfig(2, 900, 262144)
    );

    await repository.set("a", { v: 1 });
    await repository.set("b", { v: 2 });
    await repository.set("c", { v: 3 });

    expect(await repository.get("a")).toBeNull();
    expect(await repository.get("b")).toMatchObject({ value: { v: 2 } });
    expect(await repository.get("c")).toMatchObject({ value: { v: 3 } });
  });

  it("expires entries after ttl", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-24T00:00:00.000Z"));
    const repository = new MemoryPlaceableProcessingCacheRepository(
      createConfig(2000, 1, 262144)
    );

    await repository.set("ttl-key", { ok: true });
    jest.advanceTimersByTime(1100);

    expect(await repository.get("ttl-key")).toBeNull();
  });

  it("refreshes ttl on cache hit", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-24T00:00:00.000Z"));
    const repository = new MemoryPlaceableProcessingCacheRepository(
      createConfig(2000, 1, 262144)
    );

    await repository.set("hot-key", { ok: true });
    jest.advanceTimersByTime(500);

    const firstHit = await repository.get("hot-key");
    expect(firstHit?.hits).toBe(1);

    jest.advanceTimersByTime(700);
    const secondHit = await repository.get("hot-key");
    expect(secondHit?.hits).toBe(2);
  });

  it("skips storing oversized entries", async () => {
    const repository = new MemoryPlaceableProcessingCacheRepository(
      createConfig(2000, 900, 32)
    );

    await repository.set("big-key", {
      value: "x".repeat(512)
    });

    expect(await repository.get("big-key")).toBeNull();
  });

  it("keeps large entries when memory infrastructure is the authoritative cache", async () => {
    const repository = new MemoryPlaceableProcessingCacheRepository(
      createConfig(2000, 900, 32, true)
    );

    await repository.set("large-creature-key", {
      value: "x".repeat(512)
    });

    expect(await repository.get("large-creature-key")).toMatchObject({
      value: {
        value: expect.stringMatching(/^x+$/u)
      }
    });
  });
});

function createConfig(
  processingCacheL1MaxEntries: number,
  processingCacheL1TtlSeconds: number,
  processingCacheL1CatalogMaxEntryBytes: number,
  useMemoryInfrastructure = false
): AppConfigService {
  return {
    processingCacheL1CatalogMaxEntries: processingCacheL1MaxEntries,
    processingCacheL1TtlSeconds,
    processingCacheL1CatalogMaxEntryBytes,
    useMemoryInfrastructure
  } as AppConfigService;
}
