import { AppException } from "../../src/common/http/app-exception";
import {
  parsePlaceableAssetId,
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

  it("accepts Aurora GIT tags in process payload", () => {
    const parsed = parsePlaceableProcessPayload({
      templateId: "plc_campfr",
      tag: " VALELightNodeOrange03m ",
      appearanceType: 26949
    });

    expect(parsed.tag).toBe("VALELightNodeOrange03m");
  });

  it("rejects corpse as a non-Aurora subtype hint in process payload", () => {
    expect(() =>
      parsePlaceableProcessPayload({
        templateId: "plc_invis_corpse_bdy",
        subtypeHint: "corpse"
      })
    ).toThrow(AppException);
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

  it("accepts hexadecimal asset ids", () => {
    const assetId = "abc123ff";
    expect(parsePlaceableAssetId(assetId)).toBe(assetId);
  });

  it("accepts asset id path params with a delivery extension suffix", () => {
    expect(parsePlaceableAssetId("abc123ff.glb")).toBe("abc123ff");
    expect(parsePlaceableAssetId("abc123ff.gltf")).toBe("abc123ff");
  });

  it("rejects invalid asset ids", () => {
    expect(() => parsePlaceableAssetId("asset-01")).toThrow(AppException);
  });
});
