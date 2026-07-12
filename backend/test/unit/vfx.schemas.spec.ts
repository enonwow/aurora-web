import { AppException } from "../../src/common/http/app-exception";
import {
  parseVfxBenchmarkPayload,
  parseVfxCacheKey,
  parseVfxProcessPayload
} from "../../src/modules/vfx/adapters/inbound/http/vfx.schemas";

describe("vfx.schemas", () => {
  it("parses VFX process payload defaults", () => {
    const parsed = parseVfxProcessPayload({
      sourceTableText: "2DA V2.0\n\nLabel Type_FD\n0 VFX_TEST F",
      sourceObjectKey: "modules/current/vfx/visualeffects.2da"
    });

    expect(parsed).toMatchObject({
      packageKind: "runtime_package",
      sourceLayer: "external_fixture",
      bypassCache: false,
      includeBenchmarkMetadata: false,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da"
    });
  });

  it("parses VFX process payload source policy and resolver traces", () => {
    const parsed = parseVfxProcessPayload({
      packageKind: "source_parse",
      sourceTableText: "2DA V2.0\n\nLabel Type_FD\n0 VFX_TEST F",
      progFxTableText: "2DA V2.0\n\nLabel Type\n304 LightBlue5m 4",
      sourceCandidates: [
        {
          candidateId: "module:visualeffects",
          layer: "module",
          resourceKind: "table",
          resourceKey: "modules/current/vfx/visualeffects.2da",
          sourceHash: "table-hash"
        }
      ],
      resourceTraces: [
        {
          requestedResourceClass: "texture",
          requestedRef: "fx_test",
          selectedCandidate: {
            sourceLayer: "hak",
            resourceKey: "lc_vfx/fx_test.dds",
            resourceHash: "resource-hash",
            precedenceRank: 1
          },
          lowerPrecedenceCandidates: [
            {
              sourceLayer: "vanilla",
              resourceKey: "textures/fx_test.dds",
              resourceHash: "lower-hash",
              precedenceRank: 2
            }
          ]
        }
      ],
      bypassCache: "true"
    });

    expect(parsed.packageKind).toBe("source_parse");
    expect(parsed.progFxTableText).toBe("2DA V2.0\n\nLabel Type\n304 LightBlue5m 4");
    expect(parsed.bypassCache).toBe(true);
    expect(parsed.sourceCandidates?.[0]?.layer).toBe("module");
    expect(parsed.resourceTraces?.[0]?.lowerPrecedenceCandidates?.[0]?.sourceLayer).toBe("vanilla");
  });

  it("parses benchmark payload defaults and cache keys", () => {
    expect(parseVfxBenchmarkPayload({})).toMatchObject({
      iterations: 10,
      warmupIterations: 1,
      bypassCache: true
    });
    expect(parseVfxCacheKey("A".repeat(64))).toBe("a".repeat(64));
  });

  it("rejects invalid VFX API payloads", () => {
    expect(() => parseVfxProcessPayload({})).toThrow(AppException);
    expect(() => parseVfxCacheKey("not-a-cache-key")).toThrow(AppException);
    expect(() => parseVfxBenchmarkPayload({ iterations: 0 })).toThrow(AppException);
  });
});
