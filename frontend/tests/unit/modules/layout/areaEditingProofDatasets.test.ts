import { describe, expect, it } from "vitest";
import {
  buildAreaEditingProofHistorySnapshot,
  buildAreaEditingProofSelectionSnapshot,
  serializeAreaEditingProofFeedback,
  serializeAreaEditingProofHistory,
  serializeAreaEditingProofState,
  serializeAreaEditingProofSelection,
  serializeAreaEditingProofValue
} from "../../../../src/modules/layout/application/areaEditingProofDatasets";
import type { AreaScene } from "../../../../src/modules/layout/contracts";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";

function proofScene(underlayPresent: boolean): AreaScene {
  const scene = createSeedAreaScene(2, 2);
  return {
    ...scene,
    auroraAreaEditing: {
      state: {
        schemaVersion: 1,
        areaResRef: "proof",
        tilesetResRef: "proof_set",
        tilesetFingerprint: "a".repeat(64),
        width: 2,
        height: 2,
        tiles: scene.tiles.map((tile, index) => ({
          id: tile.id,
          row: tile.row,
          col: tile.col,
          tileId: index,
          orientation: 0,
          height: 0
        })),
        topology: { terrains: [], crossers: [], heights: [] },
        groupInstances: [{
          groupId: "source_group",
          anchorRow: 0,
          anchorCol: 0,
          orientation: 0,
          tileIds: [scene.tiles[0]!.id, scene.tiles[1]!.id],
          cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          ...(underlayPresent ? { underlay: { tiles: [] } } : {})
        }]
      },
      definition: {
        tilesetResRef: "proof_set",
        fingerprint: "a".repeat(64),
        transitionRules: [],
        tiles: [],
        groups: []
      },
      terrainBrush: "grass"
    }
  };
}

describe("Area editing proof selection datasets", () => {
  it("serializes stable arbitrary selection cells and source-group provenance", () => {
    const scene = proofScene(false);
    const tileIds = [scene.tiles[0]!.id, scene.tiles[3]!.id, scene.tiles[0]!.id];

    expect(buildAreaEditingProofSelectionSnapshot(scene, scene.tiles[0]!.id, tileIds)).toEqual({
      anchorTileId: scene.tiles[0]!.id,
      tileIds: [scene.tiles[0]!.id, scene.tiles[3]!.id],
      cells: [{ row: 0, col: 0 }, { row: 1, col: 1 }],
      group: { groupId: "source_group", underlayPresent: false }
    });
    expect(JSON.parse(serializeAreaEditingProofSelection(scene, scene.tiles[0]!.id, tileIds)))
      .toEqual(buildAreaEditingProofSelectionSnapshot(scene, scene.tiles[0]!.id, tileIds));
  });

  it("reports an editor-backed group and an empty selection explicitly", () => {
    const scene = proofScene(true);
    expect(buildAreaEditingProofSelectionSnapshot(scene, scene.tiles[1]!.id, [scene.tiles[1]!.id]).group)
      .toEqual({ groupId: "source_group", underlayPresent: true });
    expect(buildAreaEditingProofSelectionSnapshot(scene, null, [])).toEqual({
      anchorTileId: null,
      tileIds: [],
      cells: [],
      group: null
    });
  });

  it("serializes the complete state and every history revision canonically", () => {
    const present = proofScene(false);
    const past = {
      ...proofScene(true),
      updatedAtUnixMs: present.updatedAtUnixMs - 1
    };
    const future = {
      ...proofScene(false),
      updatedAtUnixMs: present.updatedAtUnixMs + 1
    };
    const history = { past: [past], present, future: [future] };

    expect(JSON.parse(serializeAreaEditingProofState(present))).toMatchObject({
      areaResRef: "proof",
      tiles: expect.any(Array),
      topology: { terrains: [], crossers: [], heights: [] },
      groupInstances: [{
        groupId: "source_group",
        tileIds: [present.tiles[0]!.id, present.tiles[1]!.id]
      }]
    });
    expect(JSON.parse(serializeAreaEditingProofHistory(history))).toEqual(
      buildAreaEditingProofHistorySnapshot(history)
    );
    expect(JSON.parse(serializeAreaEditingProofHistory(history))).toMatchObject({
      past: [{ state: { groupInstances: [{ underlay: { tiles: [] } }] } }],
      present: { state: { groupInstances: [{ groupId: "source_group" }] } },
      future: [{ state: { groupInstances: [{ groupId: "source_group" }] } }]
    });
  });

  it("keeps command feedback machine-readable and key-order independent", () => {
    expect(serializeAreaEditingProofFeedback({
      message: "Removed two source-group cells.",
      variant: "success"
    })).toBe('{"message":"Removed two source-group cells.","variant":"success"}');
    expect(serializeAreaEditingProofFeedback(null)).toBe("null");
    expect(serializeAreaEditingProofValue({ z: 1, nested: { b: 2, a: 1 } })).toBe(
      '{"nested":{"a":1,"b":2},"z":1}'
    );
  });
});
