import { AppException } from "../../src/common/http/app-exception";
import {
  parsePlaceableBenchmarkPayload,
  parsePlaceableCacheKey,
  parsePlaceableProcessPayload
} from "../../src/modules/catalog/adapters/inbound/http/placeables.schemas";

describe("placeables.schemas", () => {
  it("accepts vvx and vvxy subtype aliases in process payload", () => {
    const parsedVvx = parsePlaceableProcessPayload({
      templateId: "plc_001",
      subtypeHint: "vvx"
    });
    const parsedVvxy = parsePlaceableProcessPayload({
      templateId: "plc_001",
      subtypeHint: "vvxy"
    });

    expect(parsedVvx.subtypeHint).toBe("vvx");
    expect(parsedVvxy.subtypeHint).toBe("vvxy");
  });

  it("requires templateId or resref for process payload", () => {
    expect(() => parsePlaceableProcessPayload({})).toThrow(AppException);
  });

  it("parses benchmark payload defaults", () => {
    const parsed = parsePlaceableBenchmarkPayload({});
    expect(parsed.iterations).toBe(200);
    expect(parsed.warmupIterations).toBe(20);
    expect(parsed.bypassCache).toBe(true);
  });

  it("accepts hexadecimal cache keys", () => {
    const cacheKey = "a".repeat(64);
    expect(parsePlaceableCacheKey(cacheKey)).toBe(cacheKey);
  });

  it("rejects non-hexadecimal cache keys", () => {
    expect(() => parsePlaceableCacheKey("invalid:key")).toThrow(AppException);
  });
});
