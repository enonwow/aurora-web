import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Encounter CreatureList.SingleSpawn", () => {
  it("clones immutable CreatureList provenance and editable targets independently", () => {
    const source = createNewSceneObject("encounters", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "encounter",
      sourceObjectId: "enc:0:creature-list",
      encounterCreatureList: { expectedEntries: [{
        sourceIndex: 0,
        appearance: 388,
        challengeRating: 1,
        resRef: "nw_gnoll001",
        singleSpawnByte: 0,
      }] },
    };
    source.encounterProperties = { creatureList: [{
      appearance: 388,
      challengeRating: 1,
      resRef: "nw_gnoll001",
      singleSpawn: true,
    }] };

    const cloned = cloneSceneObject(source);
    expect(cloned.source?.encounterCreatureList)
      .toEqual(source.source.encounterCreatureList);
    expect(cloned.source?.encounterCreatureList)
      .not.toBe(source.source.encounterCreatureList);
    expect(cloned.source?.encounterCreatureList?.expectedEntries)
      .not.toBe(source.source.encounterCreatureList.expectedEntries);
    expect(cloned.encounterProperties?.creatureList)
      .toEqual(source.encounterProperties.creatureList);
    expect(cloned.encounterProperties?.creatureList)
      .not.toBe(source.encounterProperties.creatureList);
  });
});
