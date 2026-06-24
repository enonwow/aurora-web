import { AppException } from "../../src/common/http/app-exception";
import { buildDefaultRuntimeSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.defaults";
import type {
  RuntimeSettingsRecord
} from "../../src/modules/runtime-settings/domain/runtime-settings.types";
import { VfxApplicationService } from "../../src/modules/vfx/application/vfx.application.service";
import { buildAuroraVfxOutputCacheKey } from "../../src/modules/vfx/domain/aurora-vfx-cache-key";
import type { AuroraMdlEmitterNode } from "../../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";

const SOURCE_TABLE = [
  "2DA V2.0",
  "",
  "Label Type_FD ProgFX_Impact SoundImpact Imp_Impact_Node",
  "0 VFX_TEST F 0 snd_impact fx_impact"
].join("\n");

describe("VfxApplicationService", () => {
  it("processes and caches VFX runtime packages independently of placeable preview", async () => {
    const service = buildService();

    const first = await service.processVfxPackage({
      packageKind: "runtime_package",
      sourceTableText: SOURCE_TABLE,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da",
      sourceLayer: "external_fixture",
      sourceRowId: 0,
      effectInstance: {
        constructorKind: "EffectVisualEffect",
        sourceRowId: 0,
        applicationMode: "object",
        durationType: "instant",
        targetRef: "target-1"
      },
      sourceEmitter: buildEmitter(),
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: false,
      includeBenchmarkMetadata: false
    });
    const second = await service.processVfxPackage({
      packageKind: "runtime_package",
      sourceTableText: SOURCE_TABLE,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da",
      sourceLayer: "external_fixture",
      sourceRowId: 0,
      effectInstance: {
        constructorKind: "EffectVisualEffect",
        sourceRowId: 0,
        applicationMode: "object",
        durationType: "instant",
        targetRef: "target-1"
      },
      sourceEmitter: buildEmitter(),
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: false,
      includeBenchmarkMetadata: false
    });
    const cached = await service.getProcessedVfx(first.cache.key);

    expect(first.cache.hit).toBe(false);
    expect(second.cache.hit).toBe(true);
    expect(cached.cache.hit).toBe(true);
    expect(first.vfx.observability.runtimePackageStatus).toBe("runtime_ready");
    expect(first.vfx.observability.renderContractStatus).toBe("ready");
    expect(first.vfx.renderContract?.drawVertexCount).toBe(
      (first.vfx.renderContract?.drawParticleCount ?? 0) * 6
    );
    expect(first.vfx.dependencyGraph.edges.some((edge) => edge.edgeType === "texture")).toBe(true);
    expect(first.vfx.dependencyGraph.edges.some((edge) => edge.resolveStatus === "unresolved")).toBe(true);
  });

  it("rejects unsafe VFX source paths without fallback", async () => {
    const service = buildService();

    await expect(
      service.processVfxPackage({
        packageKind: "source_parse",
        sourceTableText: SOURCE_TABLE,
        sourceObjectKey: "../visualeffects.2da",
        sourceLayer: "external_fixture",
        bypassCache: true,
        includeBenchmarkMetadata: false
      })
    ).rejects.toMatchObject({
      code: "VFX_SOURCE_RESOURCE_PATH_UNSAFE"
    } satisfies Partial<AppException>);
  });

  it("surfaces missing VFX source policy as diagnostics instead of borrowing placeable policy", async () => {
    const settings = buildDefaultRuntimeSettings("2026-06-10T00:00:00.000Z");
    delete (settings.sources as Partial<RuntimeSettingsRecord["sources"]>).vfx;
    const service = buildService(settings);

    const response = await service.processVfxPackage({
      packageKind: "source_parse",
      sourceTableText: SOURCE_TABLE,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da",
      sourceLayer: "external_fixture",
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.sourcePolicyTrace.policyMode).toBe("missing-vfx-policy");
    expect(response.vfx.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_INTEGRATION_VFX_SOURCE_POLICY_REQUIRED"
    );
    expect(response.vfx.observability.runtimePackageStatus).toBe("diagnostic_only");
  });

  it("changes output cache key when runtime settings, HAK, source, or resource hashes change", () => {
    const base = {
      packageKind: "runtime_package",
      sourceHash: "source-a",
      sourceRowId: 0,
      runtimeSettingsRevision: 1,
      hakListHash: "hak-a",
      sourcePolicyHash: "policy-a",
      selectedTableHash: "table-a",
      selectedResourceHash: "resource-a",
      runtime: {
        dtSeconds: 0.25,
        particleLimit: 64,
        seed: 123
      }
    };

    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({ ...base, runtimeSettingsRevision: 2 })
    );
    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({ ...base, hakListHash: "hak-b" })
    );
    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({ ...base, sourceHash: "source-b" })
    );
    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({ ...base, selectedResourceHash: "resource-b" })
    );
  });

  it("returns stable benchmark contract stages for VFX pipeline slices", async () => {
    const service = buildService();

    const benchmark = await service.benchmarkVfx({
      iterations: 2,
      warmupIterations: 1,
      bypassCache: true,
      sourceTableText: SOURCE_TABLE
    });

    expect(benchmark.version).toBe("aurora-vfx-benchmark/v1");
    expect(benchmark.stages.map((stage) => stage.stage)).toEqual([
      "source_parse",
      "dependency_graph_build",
      "runtime_tick",
      "render_contract_build"
    ]);
    expect(benchmark.deterministicFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(benchmark.stages.every((stage) => stage.fingerprint.match(/^[a-f0-9]{64}$/))).toBe(true);
  });
});

function buildService(settings = buildDefaultRuntimeSettings("2026-06-10T00:00:00.000Z")) {
  return new VfxApplicationService({
    get: jest.fn().mockResolvedValue(settings),
    save: jest.fn()
  });
}

function buildEmitter(): AuroraMdlEmitterNode {
  return {
    nodeKind: "emitter",
    nodeName: "fx_test_emitter",
    provenance: {
      sourceFormat: "aurora-mdl-ascii",
      sourceModelObjectKey: "modules/current/models/fx_test.mdl",
      sourceModelFileName: "fx_test.mdl",
      sourceModelHash: "mdl-hash"
    },
    sourceFormat: "aurora-mdl-ascii",
    sourceModelObjectKey: "modules/current/models/fx_test.mdl",
    sourceModelFileName: "fx_test.mdl",
    sourceModelHash: "mdl-hash",
    texture: "fx_test_texture",
    emitterType: "Fountain",
    renderMode: "Normal",
    renderModeRaw: "Normal",
    blendMode: "Normal",
    blendModeRaw: "Normal",
    atlas: {
      effectiveXGrid: 1,
      effectiveYGrid: 1
    },
    simulation: {
      birthrate: 4,
      lifeExp: 1,
      velocity: 0,
      sizeStart: 1,
      sizeEnd: 1,
      alphaStart: 1,
      alphaEnd: 1
    },
    sourceState: {
      renderOrder: 4
    },
    directRows: [],
    keyRows: [],
    bezierKeyRows: [],
    colorTimelines: {}
  };
}
