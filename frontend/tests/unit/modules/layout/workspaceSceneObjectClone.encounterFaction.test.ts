import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("workspace Encounter Faction cloning", () => {
  it("detaches immutable catalog provenance while retaining the numeric target", () => {
    const provenance = {
      expectedValue: 1,
      catalogSha256: "f".repeat(64),
      catalogFactionCount: 5,
    };
    const difficultyProvenance = {
      expectedValue: { difficulty: 1, difficultyIndex: 2 },
      catalogSha256: "d".repeat(64),
      catalogRowCount: 5,
    };
    const object = {
      id: "encounter:0",
      kind: "encounters" as const,
      resRef: "x2_gnoll001",
      tag: "X2_GNOLL001",
      encounterFactionId: 4,
      encounterDifficulty: { difficulty: 3, difficultyIndex: 4 },
      source: {
        type: "aurora_git" as const,
        sourceKind: "encounter" as const,
        sourceIndex: 0,
        encounterFaction: provenance,
        encounterDifficulty: difficultyProvenance,
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

    const cloned = cloneSceneObject(object);

    expect(cloned.encounterFactionId).toBe(4);
    expect(cloned.source?.encounterFaction).toEqual(provenance);
    expect(cloned.source?.encounterFaction).not.toBe(provenance);
    expect(cloned.encounterDifficulty).toEqual({ difficulty: 3, difficultyIndex: 4 });
    expect(cloned.encounterDifficulty).not.toBe(object.encounterDifficulty);
    expect(cloned.source?.encounterDifficulty).toEqual(difficultyProvenance);
    expect(cloned.source?.encounterDifficulty).not.toBe(difficultyProvenance);
    expect(cloned.source?.encounterDifficulty?.expectedValue)
      .not.toBe(difficultyProvenance.expectedValue);
  });
});
