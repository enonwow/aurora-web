import { describe, expect, it } from "vitest";
import {
  buildAreaWorkspaceDiagnosticsFilename,
  buildAreaWorkspaceDiagnosticsReport
} from "../../../../src/modules/layout/application/areaWorkspaceDiagnosticsReport";
import type { AreaTileProcessContractReadiness } from "../../../../src/modules/tiles/application/areaTileProcessContractReadiness";
import type { AreaScene, SceneObject } from "../../../../src/modules/scene/contracts";

function object(input: Partial<SceneObject> & Pick<SceneObject, "id" | "kind">): SceneObject {
  return {
    id: input.id,
    kind: input.kind,
    name: input.name ?? input.id,
    resRef: input.resRef ?? "nw_object",
    tag: input.tag ?? input.id,
    x: input.x ?? 1,
    y: input.y ?? 2,
    z: input.z ?? 0,
    bearing: input.bearing ?? 0,
    visualTransform: input.visualTransform ?? {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    }
  };
}

function scene(): AreaScene {
  return {
    sceneId: "area_diagnostic",
    areaName: "Diagnostic Area",
    width: 2,
    height: 1,
    tiles: [
      {
        id: "tile-b",
        row: 0,
        col: 1,
        terrain: "stone",
        orientation: 1,
        rotateTexture: false,
        plot: false,
        tileId: 8,
        height: 2,
        modelResRef: "tcn01_a02_01",
        modelSource: "set-tile-section"
      },
      {
        id: "tile-a",
        row: 0,
        col: 0,
        terrain: "stone",
        orientation: 0,
        rotateTexture: false,
        plot: false,
        tileId: 7,
        fallbackReason: "blocked_model_contract"
      }
    ],
    objects: [
      object({ id: "sound-b", kind: "sounds", resRef: "al_citynight" }),
      object({ id: "door-a", kind: "doors", tag: "door02", resRef: "nw_door" }),
      object({ id: "placeable-a", kind: "placeables", resRef: "" })
    ],
    updatedAtUnixMs: 42,
    source: "local_draft"
  };
}

function readiness(areaId = "area_diagnostic"): AreaTileProcessContractReadiness {
  return {
    status: "partial",
    areaId,
    expectedCandidateCount: 2,
    pendingCandidateCount: 0,
    checkedCandidateCount: 2,
    readyCandidateCount: 1,
    blockedCandidateCount: 1,
    candidateSample: "tcn01_a01_01, tcn01_a02_01",
    readySample: "tcn01_a02_01",
    sourceObjectKeySample: "hak/tcn01_a02_01.mdl",
    sourceAssetContractSample: "ready, blocked",
    blockerSummary: "blocked_tile_process_contract_failed",
    sourceAssetReadyCount: 1,
    sourceAssetBlockedCount: 1,
    mdlSourceReadyCount: 1,
    mdlSourceBlockedCount: 1,
    glbGeometryReadyCount: 1,
    glbGeometryBlockedCount: 1,
    materialTextureContractReadyCount: 1,
    materialBindingBlockedCount: 1,
    renderLoaderReadyCount: 1,
    renderLoaderBlockedCount: 1,
    textureMaterialBlockerSummary: "blocked_material",
    renderAssetContractBlockerSummary: "blocked_asset",
    mdlGlbMaterialBlockerSummary: "blocked_geometry",
    entries: [
      {
        modelResRef: "tcn01_a02_01",
        tileId: "tile-b",
        status: "ready",
        processStatus: "ready",
        textureContractStatus: "ready",
        mdlSourceAssetStatus: "mdl_source_object_key_proven",
        glbGeometryStatus: "ready",
        materialReadinessStatus: "ready",
        sourceAssetContractStatus: "ready",
        sourceObjectKey: "hak/tcn01_a02_01.mdl",
        mdlSourceContentSha256: "a".repeat(64),
        renderLoaderHandoffStatus: "ready",
        renderAssetContractBlockers: "none",
        mdlGlbMaterialBlockers: "none"
      },
      {
        modelResRef: "tcn01_a01_01",
        tileId: "tile-a",
        status: "blocked",
        processStatus: "blocked",
        textureContractStatus: "blocked",
        mdlSourceAssetStatus: "blocked_tile_process_contract_failed",
        glbGeometryStatus: "blocked_tile_process_contract_missing_glb_geometry",
        materialReadinessStatus: "blocked_tile_texture_delivery_contract_missing",
        sourceAssetContractStatus: "blocked",
        renderLoaderHandoffStatus: "blocked_tile_model_geometry_loader_missing",
        renderAssetContractBlockers: "blocked_asset",
        mdlGlbMaterialBlockers: "blocked_geometry",
        code: "TILE_NOT_FOUND",
        message: "Tile model is missing."
      }
    ]
  };
}

describe("areaWorkspaceDiagnosticsReport", () => {
  it("builds one deterministic Area/cell/object/resource report and filters stale selection ids", () => {
    const source = scene();
    const result = buildAreaWorkspaceDiagnosticsReport({
      generatedAtIso: "2026-08-20T08:00:00.000Z",
      scene: source,
      selectedTileIds: ["tile-b", "missing", "tile-b"],
      selectedObjectIds: ["placeable-a", "missing", "placeable-a"],
      tileProcessReadiness: readiness()
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.schemaVersion).toBe("area-workspace-diagnostics.v1");
    expect(result.report.area).toEqual({
      sceneId: "area_diagnostic",
      areaName: "Diagnostic Area",
      source: "local_draft",
      updatedAtUnixMs: 42,
      width: 2,
      height: 1,
      tileCount: 2,
      objectCount: 3,
      tilesetResRefs: []
    });
    expect(result.report.selection).toEqual({
      tileIds: ["tile-b"],
      objectIds: ["placeable-a"]
    });
    expect(result.report.cells.map((cell) => cell.id)).toEqual(["tile-a", "tile-b"]);
    expect(result.report.cells[0]).toMatchObject({
      row: 0,
      col: 0,
      tileId: 7,
      renderStatus: "warning",
      selected: false
    });
    expect(result.report.cells[1]).toMatchObject({
      modelResRef: "tcn01_a02_01",
      renderStatus: "ready",
      selected: true
    });
    expect(result.report.objects.map((entry) => entry.id)).toEqual([
      "door-a",
      "placeable-a",
      "sound-b"
    ]);
    expect(result.report.objects.map((entry) => entry.renderStatus)).toEqual([
      "warning",
      "error",
      "non_render"
    ]);
    expect(result.report.resources.status).toBe("partial");
    expect(result.report.resources.entries.map((entry) => entry.modelResRef)).toEqual([
      "tcn01_a01_01",
      "tcn01_a02_01"
    ]);
    expect(result.report.summary).toEqual({
      cellWarnings: 1,
      objectErrors: 1,
      objectWarnings: 1,
      nonRenderObjects: 1,
      resourceReady: 1,
      resourceBlocked: 1,
      issueCount: 4
    });
    expect(result.report.issues.map((issue) => issue.code)).toEqual([
      "CELL_FALLBACK_ACTIVE",
      "OBJECT_RENDER_WARNING",
      "OBJECT_RENDER_ERROR",
      "RESOURCE_CONTRACT_BLOCKED"
    ]);
  });

  it("does not publish stale resource evidence from a different Area", () => {
    const result = buildAreaWorkspaceDiagnosticsReport({
      generatedAtIso: "2026-08-20T08:00:00.000Z",
      scene: scene(),
      selectedTileIds: [],
      selectedObjectIds: [],
      tileProcessReadiness: readiness("different_area")
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.resources).toEqual({
      status: "unavailable",
      reason: "readiness_scene_mismatch",
      entries: []
    });
    expect(result.report.issues.at(-1)).toEqual({
      scope: "resource",
      subjectId: "area_diagnostic",
      code: "RESOURCE_READINESS_STALE",
      message: "Tile resource readiness belongs to a different Area."
    });
  });

  it("fails closed on malformed identity, duplicate ids, and over-budget resource entries", () => {
    expect(buildAreaWorkspaceDiagnosticsReport({
      generatedAtIso: "not-a-date",
      scene: scene(),
      selectedTileIds: [],
      selectedObjectIds: [],
      tileProcessReadiness: null
    })).toEqual({
      ok: false,
      code: "invalid_generated_at",
      message: "Diagnostics generatedAtIso must be a canonical ISO timestamp."
    });

    const duplicateTileScene = scene();
    duplicateTileScene.tiles = [duplicateTileScene.tiles[0]!, duplicateTileScene.tiles[0]!];
    expect(buildAreaWorkspaceDiagnosticsReport({
      generatedAtIso: "2026-08-20T08:00:00.000Z",
      scene: duplicateTileScene,
      selectedTileIds: [],
      selectedObjectIds: [],
      tileProcessReadiness: null
    })).toMatchObject({ ok: false, code: "duplicate_tile_id" });

    const overBudget = readiness();
    overBudget.entries = Array.from({ length: 4097 }, (_, index) => ({
      ...overBudget.entries[0]!,
      modelResRef: `tile_${index}`,
      tileId: `tile-${index}`
    }));
    expect(buildAreaWorkspaceDiagnosticsReport({
      generatedAtIso: "2026-08-20T08:00:00.000Z",
      scene: scene(),
      selectedTileIds: [],
      selectedObjectIds: [],
      tileProcessReadiness: overBudget
    })).toEqual({
      ok: false,
      code: "resource_entry_budget_exceeded",
      message: "Diagnostics reports support at most 4096 tile resource entries."
    });
  });

  it("does not mutate the scene, selection, or readiness inputs", () => {
    const sourceScene = scene();
    const sourceReadiness = readiness();
    const selectedTileIds = ["tile-b"];
    const selectedObjectIds = ["door-a"];
    const before = structuredClone({ sourceScene, sourceReadiness, selectedTileIds, selectedObjectIds });

    buildAreaWorkspaceDiagnosticsReport({
      generatedAtIso: "2026-08-20T08:00:00.000Z",
      scene: sourceScene,
      selectedTileIds,
      selectedObjectIds,
      tileProcessReadiness: sourceReadiness
    });

    expect({ sourceScene, sourceReadiness, selectedTileIds, selectedObjectIds }).toEqual(before);
  });

  it("builds a bounded filesystem-safe filename", () => {
    expect(buildAreaWorkspaceDiagnosticsFilename(" Area/One\\Two ")).toBe(
      "area_one_two_area_diagnostics.json"
    );
    expect(buildAreaWorkspaceDiagnosticsFilename("***")).toBe("area_area_diagnostics.json");
  });
});
