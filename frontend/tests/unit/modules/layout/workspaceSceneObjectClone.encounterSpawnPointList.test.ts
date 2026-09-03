import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from
  "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Encounter SpawnPointList", () => {
  it("clones immutable provenance and structural editable targets independently", () => {
    const source = createNewSceneObject("encounters", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "encounter",
      sourceObjectId: "enc:0:spawn-points",
      encounterSpawnPoints: { expectedEntries: [{
        sourceIndex: 0,
        nativeX: 22.5,
        nativeY: 45.25,
        nativeZ: 0,
        orientation: 1.5,
      }] },
    };
    source.encounterProperties = { spawnPoints: [
      { nativeX: 7.5, nativeY: -8.25, nativeZ: 0.5, orientation: -2.5 },
    ] };

    const cloned = cloneSceneObject(source);
    expect(cloned.source?.encounterSpawnPoints)
      .toEqual(source.source.encounterSpawnPoints);
    expect(cloned.source?.encounterSpawnPoints)
      .not.toBe(source.source.encounterSpawnPoints);
    expect(cloned.source?.encounterSpawnPoints?.expectedEntries)
      .not.toBe(source.source.encounterSpawnPoints.expectedEntries);
    expect(cloned.encounterProperties?.spawnPoints)
      .toEqual(source.encounterProperties.spawnPoints);
    expect(cloned.encounterProperties?.spawnPoints)
      .not.toBe(source.encounterProperties.spawnPoints);
  });
});
