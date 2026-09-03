import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("cloneSceneObject Encounter Respawns", () => {
  it("detaches immutable source storage from editable target storage", () => {
    const source = {
      id: "encounter:0",
      kind: "encounters" as const,
      resRef: "x2_gnoll001",
      tag: "X2_GNOLL001",
      encounterRespawns: { respawns: -1 },
      source: {
        type: "aurora_git" as const,
        sourceKind: "encounter" as const,
        sourceIndex: 0,
        encounterRespawnsStorage: { respawns: 0 },
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

    expect(cloned.encounterRespawns).toEqual({ respawns: -1 });
    expect(cloned.source?.encounterRespawnsStorage).toEqual({ respawns: 0 });
    expect(cloned.encounterRespawns).not.toBe(source.encounterRespawns);
    expect(cloned.source?.encounterRespawnsStorage)
      .not.toBe(source.source.encounterRespawnsStorage);
    expect(cloned.source?.encounterRespawnsStorage)
      .not.toBe(cloned.encounterRespawns);
  });
});
