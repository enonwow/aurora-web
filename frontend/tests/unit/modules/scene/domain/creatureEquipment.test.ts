import { describe, expect, it } from "vitest";
import {
  CREATURE_EQUIPMENT_ENTRY_MAX,
  canEditExistingCreatureEquipment,
  readCreatureEquipmentSourceEntries,
  readCreatureEquipmentTargetEntries,
  sortCreatureEquipmentTargetEntries
} from "../../../../../src/modules/scene/domain/creatureEquipment";

describe("creatureEquipment", () => {
  const sourceEntries = [
    {
      sourceIndex: 0,
      resRef: "nw_sword001",
      slotMask: 16,
      dropable: true,
      pickpocketable: false
    },
    {
      sourceIndex: 1,
      resRef: "nw_helm001",
      slotMask: 1,
      dropable: false,
      pickpocketable: false
    }
  ] as const;

  it("reads and freezes exact physical Equip_ItemList provenance", () => {
    const entries = readCreatureEquipmentSourceEntries(
      JSON.stringify(sourceEntries),
      sourceEntries.length
    );

    expect(entries).toEqual(sourceEntries);
    expect(Object.isFrozen(entries)).toBe(true);
    expect(Object.isFrozen(entries?.[0])).toBe(true);
  });

  it("accepts the canonical absent-list projection", () => {
    expect(readCreatureEquipmentSourceEntries("[]", 0)).toEqual([]);
  });

  it.each([
    ["count mismatch", JSON.stringify(sourceEntries), 1],
    ["invalid JSON", "{", 0],
    ["non-array JSON", "{}", 0],
    ["sparse physical ordinal", JSON.stringify([{ ...sourceEntries[0], sourceIndex: 1 }]), 1],
    ["duplicate slot", JSON.stringify([sourceEntries[0], { ...sourceEntries[1], slotMask: 16 }]), 2],
    ["unsupported slot", JSON.stringify([{ ...sourceEntries[0], slotMask: 3 }]), 1],
    ["invalid ResRef", JSON.stringify([{ ...sourceEntries[0], resRef: "bad-resref" }]), 1],
    ["missing flag", JSON.stringify([{ sourceIndex: 0, resRef: "nw_helm001", slotMask: 1, dropable: false }]), 1],
    ["Infinite", JSON.stringify([{ ...sourceEntries[0], infinite: false }]), 1]
  ])("fails closed for %s", (_label, payload, count) => {
    expect(readCreatureEquipmentSourceEntries(payload, count)).toBeUndefined();
  });

  it("rejects a source above the recovered 18-slot budget", () => {
    const entries = Array.from({ length: CREATURE_EQUIPMENT_ENTRY_MAX + 1 }, (_, sourceIndex) => ({
      sourceIndex,
      resRef: "nw_helm001",
      slotMask: 1 << Math.min(sourceIndex, 17),
      dropable: false,
      pickpocketable: false
    }));
    expect(readCreatureEquipmentSourceEntries(JSON.stringify(entries), entries.length)).toBeUndefined();
  });

  it("sorts retained targets by slot while preserving physical source identities", () => {
    expect(sortCreatureEquipmentTargetEntries(sourceEntries)).toEqual([
      sourceEntries[1],
      sourceEntries[0]
    ]);
  });

  it("admits removal and mode-0 flag edits but not new, moved, duplicated, or reordered equipment", () => {
    expect(readCreatureEquipmentTargetEntries([
      { ...sourceEntries[1], pickpocketable: true },
      { ...sourceEntries[0], dropable: false }
    ], sourceEntries)).toEqual([
      { ...sourceEntries[1], pickpocketable: true },
      { ...sourceEntries[0], dropable: false }
    ]);
    expect(readCreatureEquipmentTargetEntries([], sourceEntries)).toEqual([]);
    expect(readCreatureEquipmentTargetEntries([{ ...sourceEntries[0] }], sourceEntries)).toEqual([
      sourceEntries[0]
    ]);
    expect(readCreatureEquipmentTargetEntries([{ ...sourceEntries[0], slotMask: 1 }], sourceEntries)).toBeUndefined();
    expect(readCreatureEquipmentTargetEntries([{ ...sourceEntries[0], resRef: "nw_helm001" }], sourceEntries)).toBeUndefined();
    expect(readCreatureEquipmentTargetEntries([{ ...sourceEntries[0] }, { ...sourceEntries[0] }], sourceEntries)).toBeUndefined();
    expect(readCreatureEquipmentTargetEntries([{ ...sourceEntries[0] }, { ...sourceEntries[1] }], sourceEntries)).toBeUndefined();
    expect(readCreatureEquipmentTargetEntries([{
      sourceIndex: 2,
      resRef: "nw_boots001",
      slotMask: 8,
      dropable: false,
      pickpocketable: false
    }], sourceEntries)).toBeUndefined();
  });

  it("admits editing only for an ordinal-bound existing Creature with exact equipment provenance", () => {
    const source = {
      type: "aurora_git" as const,
      sourceKind: "creature" as const,
      sourceObjectId: "creature:0:nw_guard:source",
      sourceIndex: 0,
      creatureEquippedItems: sourceEntries
    };
    expect(canEditExistingCreatureEquipment(source)).toBe(true);
    expect(canEditExistingCreatureEquipment({ ...source, type: "seed" })).toBe(false);
    expect(canEditExistingCreatureEquipment({ ...source, sourceKind: "placeable" })).toBe(false);
    expect(canEditExistingCreatureEquipment({ ...source, sourceObjectId: "" })).toBe(false);
    expect(canEditExistingCreatureEquipment({ ...source, sourceIndex: -1 })).toBe(false);
    expect(canEditExistingCreatureEquipment({
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: source.sourceObjectId,
      sourceIndex: 0
    })).toBe(false);
  });
});
