import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Creature SpecAbilityList", () => {
  it("independently clones immutable physical provenance and editable grouped values", () => {
    const source = createNewSceneObject("creatures", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceIndex: 0,
      sourceObjectId: "cre:0:special-abilities",
      creatureSpecialAbilityList: {
        present: true,
        nativeType: "list",
        structTypeId: 4,
        entries: [
          { spellId: 2, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
        ],
        table: {
          resourceName: "spells.2da",
          sourceObjectKey: "runtime-source/module/spells.2da",
          sourceLayer: "module",
          sha256: "e".repeat(64),
          sizeBytes: 100,
          rowCount: 10,
        },
      },
    };
    source.creatureProperties = { specialAbilities: [
      { spellId: 2, name: "Acid Fog", type: "Spells", casterLevel: 3, uses: 1 },
    ] };

    const cloned = cloneSceneObject(source);
    expect(cloned.source?.creatureSpecialAbilityList)
      .toEqual(source.source.creatureSpecialAbilityList);
    expect(cloned.source?.creatureSpecialAbilityList).not.toBe(
      source.source.creatureSpecialAbilityList,
    );
    expect(cloned.source?.creatureSpecialAbilityList?.present &&
      cloned.source.creatureSpecialAbilityList.entries).not.toBe(
      source.source.creatureSpecialAbilityList.entries,
    );
    expect(cloned.creatureProperties?.specialAbilities)
      .toEqual(source.creatureProperties.specialAbilities);
    expect(cloned.creatureProperties?.specialAbilities)
      .not.toBe(source.creatureProperties.specialAbilities);
  });
});
