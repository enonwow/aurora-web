import { describe, expect, it } from "vitest";
import { parseAreaScene } from
  "../../../../src/modules/areas/application/areaWorkspaceDraft";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

function sceneWithCreature() {
  const object = createNewSceneObject("creatures", 1, 2, 1);
  object.source = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "creature:0",
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
  object.creatureProperties = { specialAbilities: [
    { spellId: 2, name: "Acid Fog", type: "Spells", casterLevel: 3, uses: 1 },
  ] };
  return {
    sceneId: "area_special_ability_probe",
    areaName: "Special Ability Probe",
    width: 1,
    height: 1,
    tiles: [],
    objects: [object],
    updatedAtUnixMs: 100,
    source: "aurora_area",
  };
}

describe("Area workspace Creature SpecAbilityList boundary", () => {
  it("accepts exact canonical provenance and a bounded unique grouped target", () => {
    const value = sceneWithCreature();
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    [{ spellId: 2, name: "A", type: "Spells", casterLevel: 3, uses: 1 },
      { spellId: 2, name: "A", type: "Spells", casterLevel: 4, uses: 2 }],
    [{ spellId: 10, name: "Outside", type: "Spells", casterLevel: 1, uses: 1 }],
    [{ spellId: 2, name: "Overflow", type: "Spells", casterLevel: 1, uses: 256 }],
    [{ spellId: 2, name: "Level", type: "Spells", casterLevel: 16, uses: 1 }],
  ])("rejects malformed grouped target %#", (specialAbilities) => {
    const value = sceneWithCreature();
    value.objects[0]!.creatureProperties = { specialAbilities };
    expect(parseAreaScene(value)).toBeNull();
  });
});
