import { describe, expect, it } from "vitest";

import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Placeable Faction", () => {
  it("independently clones immutable catalog provenance and the Advanced target", () => {
    const source = createNewSceneObject("placeables", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "plc:0:plc_chest:source",
      placeableFaction: {
        expectedValue: 1,
        catalogSha256: "b".repeat(64),
        catalogFactionCount: 3,
      },
    };
    source.placeableProperties!.advancedSettings = {
      factionId: 1,
      belongsToFaction: "Hostile",
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.placeableFaction).toEqual(source.source.placeableFaction);
    expect(cloned.source?.placeableFaction).not.toBe(source.source.placeableFaction);
    expect(cloned.placeableProperties?.advancedSettings).toEqual({
      factionId: 1,
      belongsToFaction: "Hostile",
    });
    expect(cloned.placeableProperties?.advancedSettings)
      .not.toBe(source.placeableProperties.advancedSettings);
  });
});
