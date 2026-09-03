import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("cloneSceneObject Encounter creature counts", () => {
  it("detaches immutable source pair from editable target pair", () => {
    const source = {
      id: "encounter:0",
      kind: "encounters" as const,
      resRef: "x2_gnoll001",
      tag: "X2_GNOLL001",
      encounterCreatureCounts: { maxCreatures: 3, recCreatures: 3 },
      source: {
        type: "aurora_git" as const,
        sourceKind: "encounter" as const,
        sourceIndex: 0,
        encounterCreatureCountsStorage: { maxCreatures: 4, recCreatures: 2 },
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

    expect(cloned.encounterCreatureCounts).toEqual({ maxCreatures: 3, recCreatures: 3 });
    expect(cloned.source?.encounterCreatureCountsStorage)
      .toEqual({ maxCreatures: 4, recCreatures: 2 });
    expect(cloned.encounterCreatureCounts).not.toBe(source.encounterCreatureCounts);
    expect(cloned.source?.encounterCreatureCountsStorage)
      .not.toBe(source.source.encounterCreatureCountsStorage);
  });
});
