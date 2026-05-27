import { AppException } from "../../src/common/http/app-exception";
import {
  parseTemplateCacheKey,
  parseTemplateProcessPayload
} from "../../src/modules/catalog/adapters/inbound/http/template-processing.schemas";

describe("template-processing.schemas", () => {
  it("accepts template process payload by templateId", () => {
    const parsed = parseTemplateProcessPayload({
      templateId: "cre_guard_human_001",
      bypassCache: false
    });

    expect(parsed.templateId).toBe("cre_guard_human_001");
    expect(parsed.bypassCache).toBe(false);
    expect(parsed.includeBenchmarkMetadata).toBe(true);
  });

  it("accepts template process payload by resref", () => {
    const parsed = parseTemplateProcessPayload({
      resref: "itm_health_potion_001"
    });

    expect(parsed.resref).toBe("itm_health_potion_001");
  });

  it("rejects payload without templateId/resref", () => {
    expect(() => parseTemplateProcessPayload({})).toThrow(AppException);
  });

  it("accepts hexadecimal cache key", () => {
    const key = "a".repeat(64);
    expect(parseTemplateCacheKey(key)).toBe(key);
  });

  it("rejects invalid cache key", () => {
    expect(() => parseTemplateCacheKey("bad:key")).toThrow(AppException);
  });
});
