import { describe, expect, it } from "vitest";

import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Creature Subrace/Deity", () => {
  it("deeply detaches immutable per-field provenance and Advanced targets", () => {
    const source = createNewSceneObject("creatures", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:source",
      sourceIndex: 0,
      creatureSpecialIdentityStrings: {
        subrace: { expectedValue: "Moon Elf" },
        deity: { expectedValue: "" },
      },
    };
    source.creatureProperties!.advancedSettings = {
      ...source.creatureProperties!.advancedSettings!,
      subrace: "Sun Elf",
      deity: "Mystra",
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureSpecialIdentityStrings).toEqual(
      source.source.creatureSpecialIdentityStrings,
    );
    expect(cloned.source?.creatureSpecialIdentityStrings)
      .not.toBe(source.source.creatureSpecialIdentityStrings);
    expect(cloned.source?.creatureSpecialIdentityStrings?.subrace)
      .not.toBe(source.source.creatureSpecialIdentityStrings.subrace);
    expect(cloned.creatureProperties?.advancedSettings).not.toBe(
      source.creatureProperties?.advancedSettings,
    );
  });
});
