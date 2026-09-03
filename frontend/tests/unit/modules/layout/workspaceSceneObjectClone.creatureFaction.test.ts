import { describe, expect, it } from "vitest";

import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Creature FactionID", () => {
  it("independently clones immutable catalog provenance and the Advanced target", () => {
    const source = createNewSceneObject("creatures", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_guard:source",
      creatureFaction: {
        expectedValue: 1,
        catalogSha256: "b".repeat(64),
        catalogFactionCount: 3,
      },
    };
    source.creatureProperties!.advancedSettings = {
      ...source.creatureProperties!.advancedSettings!,
      factionId: 1,
      faction: "Hostile",
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureFaction).toEqual(source.source.creatureFaction);
    expect(cloned.source?.creatureFaction).not.toBe(source.source.creatureFaction);
    expect(cloned.creatureProperties?.advancedSettings).toMatchObject({
      factionId: 1,
      faction: "Hostile",
    });
    expect(cloned.creatureProperties?.advancedSettings)
      .not.toBe(source.creatureProperties.advancedSettings);
  });
});
