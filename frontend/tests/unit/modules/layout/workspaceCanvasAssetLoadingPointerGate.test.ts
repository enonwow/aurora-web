import { describe, expect, it } from "vitest";
import type { AreaScene, AuroraAreaEditingTool } from "../../../../src/modules/layout/contracts";
import { canUseAuroraAreaGridPointerDuringAssetLoading } from "../../../../src/modules/layout/application/workspaceCanvasAssetLoadingPointerGate";

const tools: AuroraAreaEditingTool[] = [
  { kind: "inspect" },
  { kind: "terrain", terrain: "grass" },
  { kind: "crosser", crosser: "road" },
  { kind: "height", delta: 1 },
  { kind: "eraser" },
  { kind: "group", groupId: "proof_group", orientation: 0 }
];

function createAreaScene(): AreaScene {
  return {
    sceneId: "area_new_area",
    name: "New Area",
    width: 1,
    height: 1,
    tiles: [{ id: "tile_0_0", row: 0, col: 0, terrain: "grass", height: 0 }],
    objects: [],
    auroraAreaEditing: {
      state: {
        schemaVersion: 1,
        areaResRef: "new_area",
        tilesetResRef: "proof_set",
        tilesetFingerprint: "a".repeat(64),
        width: 1,
        height: 1,
        tiles: [
          {
            id: "tile_0_0",
            row: 0,
            col: 0,
            tileId: 0,
            orientation: 0,
            height: 0
          }
        ],
        topology: {
          cornerTerrain: [["grass", "grass", "grass", "grass"]],
          cornerHeights: [[0, 0, 0, 0]],
          crossers: [[null, null, null, null]]
        },
        groupInstances: []
      },
      definition: {
        tilesetResRef: "proof_set",
        fingerprint: "a".repeat(64),
        defaultTerrain: "grass",
        transitionRules: [],
        tiles: [],
        groups: []
      },
      terrainBrush: "grass"
    }
  };
}

describe("canUseAuroraAreaGridPointerDuringAssetLoading", () => {
  it.each(tools)("allows the Aurora $kind tool on an existing terrain grid", (areaEditingTool) => {
    expect(
      canUseAuroraAreaGridPointerDuringAssetLoading({
        scene: createAreaScene(),
        selectionMode: "terrain",
        areaEditingTool,
        objectAddPlacementActive: false,
        transformInteractionActive: false
      })
    ).toBe(true);
  });

  it("keeps non-Aurora scenes and object selection behind the loading gate", () => {
    const scene = createAreaScene();
    expect(
      canUseAuroraAreaGridPointerDuringAssetLoading({
        scene: { ...scene, auroraAreaEditing: undefined },
        selectionMode: "terrain",
        areaEditingTool: { kind: "inspect" },
        objectAddPlacementActive: false,
        transformInteractionActive: false
      })
    ).toBe(false);
    expect(
      canUseAuroraAreaGridPointerDuringAssetLoading({
        scene,
        selectionMode: "object",
        areaEditingTool: { kind: "inspect" },
        objectAddPlacementActive: false,
        transformInteractionActive: false
      })
    ).toBe(false);
  });

  it.each([
    { kind: "terrain", terrain: "grass" },
    { kind: "group", groupId: "proof_group", orientation: 0 },
    { kind: "crosser", crosser: "road" },
    { kind: "height", delta: -1 }
  ] as AuroraAreaEditingTool[])("allows an explicitly armed $kind brush from object mode", (areaEditingTool) => {
    expect(canUseAuroraAreaGridPointerDuringAssetLoading({
      scene: createAreaScene(),
      selectionMode: "object",
      areaEditingTool,
      objectAddPlacementActive: false,
      transformInteractionActive: false
    })).toBe(true);
  });

  it("keeps object placement and transform interactions behind the loading gate", () => {
    const scene = createAreaScene();
    expect(
      canUseAuroraAreaGridPointerDuringAssetLoading({
        scene,
        selectionMode: "terrain",
        areaEditingTool: { kind: "terrain", terrain: "grass" },
        objectAddPlacementActive: true,
        transformInteractionActive: false
      })
    ).toBe(false);
    expect(
      canUseAuroraAreaGridPointerDuringAssetLoading({
        scene,
        selectionMode: "terrain",
        areaEditingTool: { kind: "group", groupId: "proof_group", orientation: 0 },
        objectAddPlacementActive: false,
        transformInteractionActive: true
      })
    ).toBe(false);
  });

  it("requires a projected scene grid and a non-empty authoritative editing grid", () => {
    const scene = createAreaScene();
    expect(
      canUseAuroraAreaGridPointerDuringAssetLoading({
        scene: { ...scene, tiles: [] },
        selectionMode: "terrain",
        areaEditingTool: { kind: "inspect" },
        objectAddPlacementActive: false,
        transformInteractionActive: false
      })
    ).toBe(false);
    expect(
      canUseAuroraAreaGridPointerDuringAssetLoading({
        scene: {
          ...scene,
          auroraAreaEditing: {
            ...scene.auroraAreaEditing!,
            state: { ...scene.auroraAreaEditing!.state, tiles: [] }
          }
        },
        selectionMode: "terrain",
        areaEditingTool: { kind: "inspect" },
        objectAddPlacementActive: false,
        transformInteractionActive: false
      })
    ).toBe(false);
  });
});
