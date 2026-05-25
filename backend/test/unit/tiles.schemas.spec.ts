import { AppException } from "../../src/common/http/app-exception";
import {
  parseTileBenchmarkPayload,
  parseTileCacheKey,
  parseTileListQuery,
  parseTileProcessPayload
} from "../../src/modules/tiles/adapters/inbound/http/tiles.schemas";

describe("tiles.schemas", () => {
  it("parses tile list query defaults", () => {
    const parsed = parseTileListQuery({});

    expect(parsed.limit).toBe(20);
    expect(parsed.offset).toBe(0);
  });

  it("parses tile process payload defaults", () => {
    const parsed = parseTileProcessPayload({});
    expect(parsed.bypassCache).toBe(false);
  });

  it("parses tile benchmark payload defaults", () => {
    const parsed = parseTileBenchmarkPayload({});
    expect(parsed.iterations).toBe(200);
    expect(parsed.warmupIterations).toBe(20);
    expect(parsed.bypassCache).toBe(true);
  });

  it("accepts tile cache key", () => {
    const key = "a".repeat(64);
    expect(parseTileCacheKey(key)).toBe(key);
  });

  it("rejects invalid tile cache key", () => {
    expect(() => parseTileCacheKey("invalid:key")).toThrow(AppException);
  });
});
