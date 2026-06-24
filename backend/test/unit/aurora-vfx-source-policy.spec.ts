import {
  buildAuroraVfxSourcePolicyCacheKey,
  buildAuroraVfxSourcePolicyTrace
} from "../../src/modules/vfx/domain/aurora-vfx-source-policy";
import { buildDefaultRuntimeSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.defaults";
import type { RuntimeSettingsRecord } from "../../src/modules/runtime-settings/domain/runtime-settings.types";

describe("Aurora VFX source policy", () => {
  it("selects VFX HAK candidates through sources.vfx and records lower-precedence sources", () => {
    const settings = buildSettings();
    settings.sources.vfx.hakPriorityList = [
      "lc_2da.hak",
      "lc_vfx.hak",
      "cep3_vfx.hak"
    ];

    const trace = buildAuroraVfxSourcePolicyTrace({
      settings,
      candidates: [
        {
          candidateId: "cep3-visualeffects",
          layer: "hak",
          hakName: "cep3_vfx.hak",
          resourceKind: "table",
          resourceKey: "visualeffects.2da",
          sourcePath: "C:/nwn/hak/cep3_vfx.hak",
          sourceHash: "hash-cep3-table"
        },
        {
          candidateId: "vanilla-visualeffects",
          layer: "vanilla",
          resourceKind: "table",
          resourceKey: "visualeffects.2da",
          sourceHash: "hash-vanilla-table"
        },
        {
          candidateId: "lc-visualeffects",
          layer: "hak",
          hakName: "lc_vfx.hak",
          resourceKind: "table",
          resourceKey: "visualeffects.2da",
          sourcePath: "C:/nwn/hak/lc_vfx.hak",
          sourceHash: "hash-lc-table"
        }
      ]
    });

    expect(trace.policyMode).toBe("runtime-settings-vfx");
    expect(trace.runtimeSettingsRevision).toBe(9);
    expect(trace.selectedSource).toMatchObject({
      candidateId: "lc-visualeffects",
      layer: "hak",
      hakName: "lc_vfx.hak",
      resourceKey: "visualeffects.2da",
      tableHash: "hash-lc-table"
    });
    expect(trace.lowerPrecedenceCandidates.map((candidate) => candidate.candidateId)).toEqual([
      "cep3-visualeffects",
      "vanilla-visualeffects"
    ]);
    expect(trace.hakListHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(trace.vfxHakProvenance).toEqual([
      {
        hakName: "lc_vfx.hak",
        normalizedHakName: "lc_vfx.hak",
        listIndex: 1,
        selected: true
      },
      {
        hakName: "cep3_vfx.hak",
        normalizedHakName: "cep3_vfx.hak",
        listIndex: 2,
        selected: false
      }
    ]);
    expect(trace.diagnostics).toEqual([]);
  });

  it("records module-selected resources and selected resource hash", () => {
    const settings = buildSettings();

    const trace = buildAuroraVfxSourcePolicyTrace({
      settings,
      candidates: [
        {
          candidateId: "module-mdl",
          layer: "module",
          resourceKind: "resource",
          resourceKey: "models/vfx_fire.mdl",
          sourceHash: "hash-module-mdl"
        },
        {
          candidateId: "hak-mdl",
          layer: "hak",
          hakName: "lc_vfx.hak",
          resourceKind: "resource",
          resourceKey: "models/vfx_fire.mdl",
          sourceHash: "hash-hak-mdl"
        }
      ]
    });

    expect(trace.selectedSource).toMatchObject({
      candidateId: "module-mdl",
      layer: "module",
      resourceHash: "hash-module-mdl"
    });
    expect(trace.lowerPrecedenceCandidates.map((candidate) => candidate.candidateId)).toEqual([
      "hak-mdl"
    ]);
    expect(trace.cacheKeyParts.selectedSourceLayer).toBe("module");
    expect(trace.cacheKeyParts.selectedResourceHash).toBe("hash-module-mdl");
  });

  it("changes output cache key when revision, HAK list, or selected source hash changes", () => {
    const baseSettings = buildSettings();
    const baseTrace = buildAuroraVfxSourcePolicyTrace({
      settings: baseSettings,
      candidates: [tableCandidate("hash-a")]
    });
    const baseKey = buildAuroraVfxSourcePolicyCacheKey(baseTrace.cacheKeyParts, "source-table");

    const revisionTrace = buildAuroraVfxSourcePolicyTrace({
      settings: {
        ...baseSettings,
        revision: baseSettings.revision + 1
      },
      candidates: [tableCandidate("hash-a")]
    });
    const hakTrace = buildAuroraVfxSourcePolicyTrace({
      settings: {
        ...baseSettings,
        sources: {
          ...baseSettings.sources,
          vfx: {
            ...baseSettings.sources.vfx,
            hakPriorityList: ["cep3_vfx.hak", "lc_vfx.hak"]
          }
        }
      },
      candidates: [tableCandidate("hash-a")]
    });
    const sourceTrace = buildAuroraVfxSourcePolicyTrace({
      settings: baseSettings,
      candidates: [tableCandidate("hash-b")]
    });

    expect(buildAuroraVfxSourcePolicyCacheKey(revisionTrace.cacheKeyParts, "source-table")).not.toBe(
      baseKey
    );
    expect(buildAuroraVfxSourcePolicyCacheKey(hakTrace.cacheKeyParts, "source-table")).not.toBe(
      baseKey
    );
    expect(buildAuroraVfxSourcePolicyCacheKey(sourceTrace.cacheKeyParts, "source-table")).not.toBe(
      baseKey
    );
  });

  it("emits a diagnostic when sources.vfx is missing", () => {
    const settings = buildSettings() as Partial<RuntimeSettingsRecord>;
    delete (settings.sources as Partial<RuntimeSettingsRecord["sources"]>).vfx;

    const trace = buildAuroraVfxSourcePolicyTrace({
      settings,
      candidates: [tableCandidate("hash-a")]
    });

    expect(trace.policyMode).toBe("missing-vfx-policy");
    expect(trace.selectedSource).toBeUndefined();
    expect(trace.diagnostics).toEqual([
      {
        code: "VFX_INTEGRATION_VFX_SOURCE_POLICY_REQUIRED",
        severity: "error",
        message:
          "Runtime settings must define sources.vfx before VFX source rows or resources are selected."
      }
    ]);
  });
});

function buildSettings(): RuntimeSettingsRecord {
  const settings = buildDefaultRuntimeSettings("2026-06-10T00:00:00.000Z");
  return {
    ...settings,
    revision: 9,
    paths: {
      ...settings.paths,
      hakDirectoryPath: "C:/nwn/hak"
    },
    hakProfiles: {
      ...settings.hakProfiles,
      lc_vfx: ["lc_2da.hak", "lc_vfx.hak", "cep3_vfx.hak"]
    },
    sources: {
      ...settings.sources,
      vfx: {
        includeModuleTemp0: true,
        includeModulePacked: false,
        includeHaks: true,
        includeVanilla: true,
        hakProfileId: "lc_vfx",
        hakPriorityList: ["lc_2da.hak", "lc_vfx.hak", "cep3_vfx.hak"]
      }
    }
  };
}

function tableCandidate(sourceHash: string) {
  return {
    candidateId: "lc-visualeffects",
    layer: "hak" as const,
    hakName: "lc_vfx.hak",
    resourceKind: "table" as const,
    resourceKey: "visualeffects.2da",
    sourceHash
  };
}
