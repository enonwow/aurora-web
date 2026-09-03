import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("cloneSceneObject Encounter SpawnOption", () => {
  it("detaches immutable source storage from editable target storage", () => {
    const source = {
      id: "encounter:0",
      kind: "encounters" as const,
      resRef: "x2_gnoll001",
      tag: "X2_GNOLL001",
      encounterSpawnOption: { spawnOption: 0 as const },
      source: {
        type: "aurora_git" as const,
        sourceKind: "encounter" as const,
        sourceIndex: 0,
        encounterSpawnOptionStorage: { spawnOption: 0 as const },
      },
      x: 0,
      y: 0,
      z: 0,
      bearing: 0,
      visualTransform: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        roll: 0,
        yaw: 0,
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.encounterSpawnOption).toEqual({ spawnOption: 0 });
    expect(cloned.source?.encounterSpawnOptionStorage).toEqual({ spawnOption: 0 });
    expect(cloned.encounterSpawnOption).not.toBe(source.encounterSpawnOption);
    expect(cloned.source?.encounterSpawnOptionStorage)
      .not.toBe(source.source.encounterSpawnOptionStorage);
    expect(cloned.source?.encounterSpawnOptionStorage)
      .not.toBe(cloned.encounterSpawnOption);
  });
});
