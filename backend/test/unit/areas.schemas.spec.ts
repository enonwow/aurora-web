import { AppException } from "../../src/common/http/app-exception";
import {
  parseAreaCacheKey,
  parseAreaListQuery,
  parseAreaProcessPayload
} from "../../src/modules/areas/adapters/inbound/http/areas.schemas";

describe("areas.schemas", () => {
  it("parses area list query defaults", () => {
    const parsed = parseAreaListQuery({});

    expect(parsed.limit).toBe(20);
    expect(parsed.offset).toBe(0);
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
});
