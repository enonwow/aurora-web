import { AppException } from "../../src/common/http/app-exception";
import {
  parseSoundBenchmarkPayload,
  parseSoundCacheKey,
  parseSoundListQuery,
  parseSoundProcessPayload
} from "../../src/modules/sounds/adapters/inbound/http/sounds.schemas";

describe("sounds.schemas", () => {
  it("parses sound list query defaults", () => {
    const parsed = parseSoundListQuery({});

    expect(parsed.limit).toBe(20);
    expect(parsed.offset).toBe(0);
  });

  it("parses sound list query category", () => {
    const parsed = parseSoundListQuery({ category: "music" });
    expect(parsed.category).toBe("music");
  });

  it("parses sound process payload defaults", () => {
    const parsed = parseSoundProcessPayload({});
    expect(parsed.bypassCache).toBe(false);
  });

  it("parses sound benchmark payload defaults", () => {
    const parsed = parseSoundBenchmarkPayload({});
    expect(parsed.iterations).toBe(200);
    expect(parsed.warmupIterations).toBe(20);
    expect(parsed.bypassCache).toBe(true);
  });

  it("accepts sound cache key", () => {
    const key = "a".repeat(64);
    expect(parseSoundCacheKey(key)).toBe(key);
  });

  it("rejects invalid sound cache key", () => {
    expect(() => parseSoundCacheKey("invalid:key")).toThrow(AppException);
  });
});
