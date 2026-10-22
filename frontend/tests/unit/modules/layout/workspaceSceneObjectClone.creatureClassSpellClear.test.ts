import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Creature class spell-list clear", () => {
  it("independently clones the staged class-slot index vector", () => {
    const source = createNewSceneObject("creatures", 1, 2, 1);
    source.creatureProperties!.classSpellClearSlotIndices = [0, 2];
    source.creatureProperties!.classSpellClearConfirmed = true;
    source.creatureProperties!.classSpellRemovalTargets = [{
      classSlotIndex: 0,
      listKind: "known",
      spellLevel: 1,
      entryIndex: 2,
    }];
    source.creatureProperties!.classSpellRemovalConfirmed = true;
    source.creatureProperties!.classSpellReorders = [{
      classSlotIndex: 0,
      listKind: "known",
      spellLevel: 1,
      entryOrder: [2, 0, 1],
    }];
    source.creatureProperties!.classSpellReorderConfirmed = true;

    const cloned = cloneSceneObject(source);

    expect(cloned.creatureProperties?.classSpellClearSlotIndices).toEqual([0, 2]);
    expect(cloned.creatureProperties?.classSpellClearSlotIndices).not.toBe(
      source.creatureProperties?.classSpellClearSlotIndices,
    );
    expect(cloned.creatureProperties?.classSpellClearConfirmed).toBe(true);
    expect(cloned.creatureProperties?.classSpellRemovalTargets).toEqual([{
      classSlotIndex: 0,
      listKind: "known",
      spellLevel: 1,
      entryIndex: 2,
    }]);
    expect(cloned.creatureProperties?.classSpellRemovalTargets).not.toBe(
      source.creatureProperties?.classSpellRemovalTargets,
    );
    expect(cloned.creatureProperties?.classSpellRemovalTargets?.[0]).not.toBe(
      source.creatureProperties?.classSpellRemovalTargets?.[0],
    );
    expect(cloned.creatureProperties?.classSpellRemovalConfirmed).toBe(true);
    expect(cloned.creatureProperties?.classSpellReorders).toEqual([{
      classSlotIndex: 0,
      listKind: "known",
      spellLevel: 1,
      entryOrder: [2, 0, 1],
    }]);
    expect(cloned.creatureProperties?.classSpellReorders).not.toBe(
      source.creatureProperties?.classSpellReorders,
    );
    expect(cloned.creatureProperties?.classSpellReorders?.[0]?.entryOrder).not.toBe(
      source.creatureProperties?.classSpellReorders?.[0]?.entryOrder,
    );
    expect(cloned.creatureProperties?.classSpellReorderConfirmed).toBe(true);
  });
});
