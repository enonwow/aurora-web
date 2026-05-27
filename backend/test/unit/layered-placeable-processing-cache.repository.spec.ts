import { AppConfigService } from "../../src/common/config/app-config.service";
import { LayeredPlaceableProcessingCacheRepository } from "../../src/modules/catalog/adapters/outbound/layered/layered-placeable-processing-cache.repository";
import type {
  PlaceableProcessingCachePort,
  ProcessingCacheEntry
} from "../../src/modules/catalog/application/ports/placeable-processing-cache.port";

describe("LayeredPlaceableProcessingCacheRepository", () => {
  const key = "cache-key";
  const value = { foo: "bar" };

  function createPortMock(): jest.Mocked<PlaceableProcessingCachePort> {
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
    const entry: ProcessingCacheEntry<typeof value> = {
      key,
      value,
      storedAt: "2026-05-24T00:00:00.000Z",
      hits: 3
    };
    memoryCache.get.mockResolvedValue(entry);

    const repository = new LayeredPlaceableProcessingCacheRepository(
      s3Cache as any,
      memoryCache as any,
      createConfig()
    );

    const result = await repository.get<typeof value>(key);

    expect(result).toEqual(entry);
    expect(s3Cache.get).not.toHaveBeenCalled();
  });

  it("does not hydrate L1 on first L2 hit", async () => {
    const memoryCache = createPortMock();
    const s3Cache = createPortMock();
    const entry: ProcessingCacheEntry<typeof value> = {
      key,
      value,
      storedAt: "2026-05-24T00:00:00.000Z",
      hits: 1
    };
    memoryCache.get.mockResolvedValue(null);
    s3Cache.get.mockResolvedValue(entry);

    const repository = new LayeredPlaceableProcessingCacheRepository(
      s3Cache as any,
      memoryCache as any,
      createConfig()
    );

    const result = await repository.get<typeof value>(key);

    expect(result).toEqual(entry);
    expect(memoryCache.set).not.toHaveBeenCalled();
  });

  it("hydrates L1 on second L2 hit for same key", async () => {
    const memoryCache = createPortMock();
    const s3Cache = createPortMock();
    const entry: ProcessingCacheEntry<typeof value> = {
      key,
      value,
      storedAt: "2026-05-24T00:00:00.000Z",
      hits: 1
    };
    memoryCache.get.mockResolvedValue(null);
    s3Cache.get.mockResolvedValue(entry);
    memoryCache.set.mockResolvedValue({
      ...entry,
      hits: 0
    });

    const repository = new LayeredPlaceableProcessingCacheRepository(
      s3Cache as any,
      memoryCache as any,
      createConfig()
    );

    await repository.get<typeof value>(key);
    await repository.get<typeof value>(key);

    expect(memoryCache.set).toHaveBeenCalledTimes(1);
    expect(memoryCache.set).toHaveBeenCalledWith(key, value);
  });

  it("writes through to L2 and L1", async () => {
    const memoryCache = createPortMock();
    const s3Cache = createPortMock();
    const entry: ProcessingCacheEntry<typeof value> = {
      key,
      value,
      storedAt: "2026-05-24T00:00:00.000Z",
      hits: 0
    };
    s3Cache.set.mockResolvedValue(entry);
    memoryCache.set.mockResolvedValue(entry);

    const repository = new LayeredPlaceableProcessingCacheRepository(
      s3Cache as any,
      memoryCache as any,
      createConfig()
    );

    const result = await repository.set(key, value);

    expect(result).toEqual(entry);
    expect(s3Cache.set).toHaveBeenCalledWith(key, value);
    expect(memoryCache.set).toHaveBeenCalledWith(key, value);
  });
});
