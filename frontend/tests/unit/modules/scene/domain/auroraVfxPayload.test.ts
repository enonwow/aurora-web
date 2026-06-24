import { describe, expect, it } from "vitest";
import type { SceneObject } from "../../../../../src/modules/scene/contracts";
import {
  buildSceneObjectVfxPayloadFromAuroraPayload,
  mapAuroraVfxPayloadToSceneObject,
  summarizeAuroraVfxDiagnosticGroups
} from "../../../../../src/modules/scene/domain/auroraVfxPayload";
import {
  createNewSceneObject,
  normalizeSceneObjectMetadata
} from "../../../../../src/modules/scene/domain/sceneFactory";
import {
  loadLocalSceneDraft,
  saveLocalSceneDraft
} from "../../../../../src/modules/scene/adapters/localDraftStore";
import { cloneSceneObject } from "../../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("Aurora VFX payload bridge", () => {
  it("maps backend payloads to versioned scene VFX payloads with grouped diagnostics", () => {
    const payload = buildSceneObjectVfxPayloadFromAuroraPayload(canonicalBackendPayload());

    expect(payload).toMatchObject({
      version: "scene-object-vfx-preserve/v1",
      canonicalStatus: "canonical",
      sourceKind: "effect_instance",
      sourceTable: "visualeffects.2da",
      sourceRowId: 42,
      previewMode: "none",
      auroraPayload: {
        version: "aurora-vfx-payload/v1",
        canonicalStatus: "canonical",
        backendCanonical: true,
        diagnostics: {
          sourceRows: [expect.objectContaining({ code: "VFX_SOURCE_ROW_FACT" })],
          effectInstance: [expect.objectContaining({ code: "VFX_EFFECT_INSTANCE_READY" })],
          phaseSchedule: [expect.objectContaining({ code: "VFX_PHASE_READY" })],
          dependencyGraph: [expect.objectContaining({ code: "VFX_DEPENDENCY_READY" })],
          runtimeState: [expect.objectContaining({ code: "VFX_RUNTIME_READY" })],
          renderContract: [expect.objectContaining({ code: "VFX_RENDER_READY" })]
        }
      }
    });
    expect(payload?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_SOURCE_ROW_FACT",
        "VFX_EFFECT_INSTANCE_READY",
        "VFX_PHASE_READY",
        "VFX_DEPENDENCY_READY",
        "VFX_RUNTIME_READY",
        "VFX_RENDER_READY"
      ])
    );

    const summary = summarizeAuroraVfxDiagnosticGroups(payload?.auroraPayload);
    expect(summary?.label).toBe(
      "source 1, effect 1, schedule 1, dependency 1, runtime 1, render 1"
    );
  });

  it("only preserves canonical status when backendCanonical is explicit", () => {
    const payload = buildSceneObjectVfxPayloadFromAuroraPayload({
      ...canonicalBackendPayload(),
      backendCanonical: false,
      canonicalStatus: "canonical"
    });

    expect(payload?.canonicalStatus).toBe("preview_only");
    expect(payload?.auroraPayload?.backendCanonical).toBe(false);
    expect(payload?.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_CANONICAL_STATUS_BACKEND_MARK_REQUIRED"
    );
  });

  it("preserves already-versioned nested contracts for canonical renderer payloads", () => {
    const payload = buildSceneObjectVfxPayloadFromAuroraPayload({
      version: "aurora-vfx-payload/v1",
      canonicalStatus: "canonical",
      backendCanonical: true,
      sourceKind: "effect_instance",
      previewMode: "none",
      diagnostics: {
        sourceRows: [],
        effectInstance: [],
        phaseSchedule: [],
        dependencyGraph: [],
        runtimeState: [],
        renderContract: [],
        payload: []
      },
      contracts: {
        dependencyGraph: {
          version: "aurora-vfx-dependency-graph/v1",
          edges: [{ edgeType: "texture", requestedResourceClass: "texture", requestedRef: "fx" }]
        },
        renderContract: {
          version: "aurora-vfx-runtime-render-contract/v1",
          drawParticleCount: 1,
          drawVertexCount: 6,
          drawRecords: []
        }
      },
      provenance: {
        renderContractVersion: "aurora-vfx-runtime-render-contract/v1"
      }
    });

    expect(payload?.auroraPayload?.contracts.renderContract).toMatchObject({
      version: "aurora-vfx-runtime-render-contract/v1",
      drawParticleCount: 1,
      drawVertexCount: 6
    });
    expect(payload?.auroraPayload?.contracts.dependencyGraph).toMatchObject({
      version: "aurora-vfx-dependency-graph/v1"
    });
  });

  it("normalizes mixed old/new scene payloads without letting legacy preview claim canonical", () => {
    const source = createNewSceneObject("placeables", 1, 2, 7);
    const normalized = normalizeSceneObjectMetadata({
      ...source,
      vfxPayload: {
        profile: "legacy-preview",
        emitter: "fx_legacy",
        script: "",
        sourceKind: "placeable_preview",
        sourceProfile: "catalog-placeable-vfx",
        sourceTable: "placeable-template-catalog",
        sourceLabel: "Legacy",
        sourceResRef: "fx_legacy",
        previewMode: "sprite_scaffold",
        canonicalStatus: "canonical",
        diagnostics: [],
        auroraPayload: {
          version: "aurora-vfx-payload/v1",
          canonicalStatus: "canonical",
          backendCanonical: false,
          sourceKind: "effect_instance",
          previewMode: "none",
          diagnostics: {
            sourceRows: [{ code: "VFX_SOURCE_LEGACY", severity: "info", message: "" }],
            effectInstance: [],
            phaseSchedule: [],
            dependencyGraph: [],
            runtimeState: [],
            renderContract: [],
            payload: []
          },
          contracts: {},
          provenance: {
            sourceTable: "visualeffects.2da",
            sourceRowId: 3,
            sourceResRef: "fx_legacy"
          }
        },
        flags: {},
        extra: {}
      }
    } as SceneObject);

    expect(normalized.vfxPayload).toMatchObject({
      version: "scene-object-vfx-preserve/v1",
      canonicalStatus: "preview_only",
      sourceKind: "effect_instance",
      sourceTable: "visualeffects.2da",
      sourceRowId: 3
    });
    expect(normalized.vfxPayload?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_CANONICAL_STATUS_BACKEND_MARK_REQUIRED",
        "VFX_SOURCE_LEGACY"
      ])
    );
  });

  it("maps backend VFX payloads to existing scene objects without adding SceneObjectKind vfx", () => {
    const object = mapAuroraVfxPayloadToSceneObject(canonicalBackendPayload(), {
      id: "vfx:test",
      x: 4,
      y: 5
    });

    expect(object).toMatchObject({
      id: "vfx:test",
      kind: "placeables",
      resRef: "vfx_impact",
      x: 4,
      y: 5,
      vfxPayload: {
        canonicalStatus: "canonical"
      }
    });
  });

  it("persists versioned VFX payloads through local draft storage", () => {
    window.localStorage.clear();
    const object = mapAuroraVfxPayloadToSceneObject(canonicalBackendPayload(), {
      id: "vfx:persist"
    });
    expect(object).toBeDefined();

    saveLocalSceneDraft(
      "u_vfx",
      {
        sceneId: "scene:vfx",
        areaName: "VFX Scene",
        width: 1,
        height: 1,
        tiles: [],
        objects: [object!],
        updatedAtUnixMs: 1,
        source: "seed"
      },
      window.localStorage
    );
    const loaded = loadLocalSceneDraft("u_vfx", window.localStorage);

    expect(loaded?.objects[0]?.vfxPayload?.auroraPayload).toMatchObject({
      version: "aurora-vfx-payload/v1",
      canonicalStatus: "canonical",
      backendCanonical: true
    });
  });

  it("clone/copy helpers deep-copy nested VFX payload diagnostics and contracts", () => {
    const object = mapAuroraVfxPayloadToSceneObject(canonicalBackendPayload(), {
      id: "vfx:clone"
    });
    expect(object).toBeDefined();

    const cloned = cloneSceneObject(object!);
    expect(cloned.vfxPayload).toEqual(object!.vfxPayload);
    expect(cloned.vfxPayload).not.toBe(object!.vfxPayload);
    expect(cloned.vfxPayload?.auroraPayload).not.toBe(object!.vfxPayload?.auroraPayload);
    expect(cloned.vfxPayload?.auroraPayload?.diagnostics.sourceRows[0]).not.toBe(
      object!.vfxPayload?.auroraPayload?.diagnostics.sourceRows[0]
    );
    expect(cloned.vfxPayload?.auroraPayload?.contracts.renderContract).not.toBe(
      object!.vfxPayload?.auroraPayload?.contracts.renderContract
    );
  });
});

function canonicalBackendPayload() {
  return {
    version: "backend-vfx-payload/test",
    canonicalStatus: "canonical",
    backendCanonical: true,
    sourceKind: "effect_instance",
    previewMode: "none",
    sourceProfile: "nwn-ee",
    sourceTable: "visualeffects.2da",
    sourceRowId: 42,
    sourceLabel: "Impact VFX",
    sourceResRef: "vfx_impact",
    effectInstanceId: "eff-1",
    runtimeProfile: "aurora-ee",
    sourceRows: {
      rowId: 42,
      diagnostics: [{ code: "VFX_SOURCE_ROW_FACT", severity: "info", message: "source" }]
    },
    effectInstance: {
      sourceRowId: 42,
      diagnostics: [{ code: "VFX_EFFECT_INSTANCE_READY", severity: "info", message: "effect" }]
    },
    phaseSchedule: {
      diagnostics: [{ code: "VFX_PHASE_READY", severity: "info", message: "schedule" }]
    },
    dependencyGraph: {
      diagnostics: [{ code: "VFX_DEPENDENCY_READY", severity: "info", message: "dependency" }]
    },
    runtimeState: {
      diagnostics: [{ code: "VFX_RUNTIME_READY", severity: "info", message: "runtime" }]
    },
    renderContract: {
      version: "aurora-vfx-runtime-render-contract/v1",
      diagnostics: [{ code: "VFX_RENDER_READY", severity: "info", message: "render" }]
    }
  };
}
