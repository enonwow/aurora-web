import { AppException } from "../../src/common/http/app-exception";
import {
  parseSoundAudioDeliveryQuery,
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

  it("parses sound list query aurora filters", () => {
    const parsed = parseSoundListQuery({
      format: "bmu",
      spatialMode: "2d",
      bindingKey: "GI_sound_area",
      sourceField: "MusicDay",
      defaultsTable: "sounddefaultspos"
    });

    expect(parsed).toMatchObject({
      format: "bmu",
      spatialMode: "2d",
      bindingKey: "GI_sound_area",
      sourceField: "MusicDay",
      defaultsTable: "sounddefaultspos"
    });
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

  it("parses sound audio delivery query defaults", () => {
    const parsed = parseSoundAudioDeliveryQuery({});
    expect(parsed.mode).toBe("proxy");
  });

  it("parses sound audio delivery query direct mode", () => {
    const parsed = parseSoundAudioDeliveryQuery({ mode: "direct" });
    expect(parsed.mode).toBe("direct");
  });

  it("rejects invalid sound audio delivery query mode", () => {
    expect(() => parseSoundAudioDeliveryQuery({ mode: "invalid" })).toThrow(AppException);
  });
});
