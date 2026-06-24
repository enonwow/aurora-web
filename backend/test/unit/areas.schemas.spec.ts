import { AppException } from "../../src/common/http/app-exception";
import {
  parseAreaCacheKey,
  parseAreaListQuery,
  parseAreaProcessPayload,
  parseAreaTextureDeliveryQuery
} from "../../src/modules/areas/adapters/inbound/http/areas.schemas";

describe("areas.schemas", () => {
  it("parses area list query defaults", () => {
    const parsed = parseAreaListQuery({});

    expect(parsed.limit).toBe(20);
    expect(parsed.offset).toBe(0);
  });

  it("accepts large area pages for frontend list caching", () => {
    const parsed = parseAreaListQuery({
      limit: "1000",
      offset: "0"
    });

    expect(parsed.limit).toBe(1000);
  });

  it("rejects area pages above the frontend cache limit", () => {
    expect(() => parseAreaListQuery({ limit: "1001" })).toThrow(AppException);
  });

  it("parses area process payload defaults", () => {
    const parsed = parseAreaProcessPayload({});
    expect(parsed.bypassCache).toBe(false);
  });

  it("accepts area cache key", () => {
    const key = "a".repeat(64);
    expect(parseAreaCacheKey(key)).toBe(key);
  });

  it("rejects invalid area cache key", () => {
    expect(() => parseAreaCacheKey("invalid:key")).toThrow(AppException);
  });

  it("parses area texture delivery query defaults", () => {
    const parsed = parseAreaTextureDeliveryQuery({});
    expect(parsed.mode).toBe("proxy");
  });

  it("parses area texture delivery direct mode", () => {
    const parsed = parseAreaTextureDeliveryQuery({ mode: "direct" });
    expect(parsed.mode).toBe("direct");
  });

  it("rejects invalid area texture delivery mode", () => {
    expect(() => parseAreaTextureDeliveryQuery({ mode: "invalid" })).toThrow(AppException);
  });
});
