import {
  AREA_CREATURE_EQUIPMENT_SLOT_MASKS,
  AreaCreatureEquipmentValidationError,
  areaCreatureEquipmentEntriesEqual,
  parseAreaCreatureEquipmentMutation,
  parseAreaCreatureEquipmentSourceEntries,
  parseAreaCreatureEquipmentTargetEntries,
} from "../../src/modules/areas/domain/area-creature-equipment";

describe("Creature Equip_ItemList retained-subset domain validation", () => {
  const rightHand = Object.freeze({
    sourceIndex: 0,
    resRef: "nw_wswmls001",
    slotMask: 0x10,
    dropable: false,
    pickpocketable: false,
  });
  const head = Object.freeze({
    sourceIndex: 1,
    resRef: "nw_helm001",
    slotMask: 0x1,
    dropable: true,
    pickpocketable: false,
  });

  it("accepts all 18 recovered one-hot slot masks and freezes exact source entries", () => {
    const entries = parseAreaCreatureEquipmentSourceEntries(
      AREA_CREATURE_EQUIPMENT_SLOT_MASKS.map((slotMask, sourceIndex) => ({
        sourceIndex,
        resRef: `item_${sourceIndex}`,
        slotMask,
        dropable: sourceIndex % 2 === 0,
        pickpocketable: sourceIndex % 3 === 0,
      })),
      "equipment.expectedEntries",
    );

    expect(entries).toHaveLength(18);
    expect(entries.map((entry) => entry.slotMask)).toEqual(
      AREA_CREATURE_EQUIPMENT_SLOT_MASKS,
    );
    expect(Object.isFrozen(entries)).toBe(true);
    expect(Object.isFrozen(entries[0])).toBe(true);
  });

  it("accepts a strictly slot-ordered retained subset with editable mode-0 flags", () => {
    const source = parseAreaCreatureEquipmentSourceEntries(
      [rightHand, head],
      "equipment.expectedEntries",
    );

    expect(parseAreaCreatureEquipmentTargetEntries([
      { ...head, dropable: false, pickpocketable: true },
      { ...rightHand, dropable: true },
    ], source, "equipment.entries")).toEqual([
      { ...head, dropable: false, pickpocketable: true },
      { ...rightHand, dropable: true },
    ]);
    expect(parseAreaCreatureEquipmentTargetEntries(
      [],
      source,
      "equipment.entries",
    )).toEqual([]);
  });

  it.each([
    ["non-array", null],
    ["more than 18 entries", Array.from({ length: 19 }, (_, sourceIndex) => ({
      sourceIndex,
      resRef: "item",
      slotMask: 1 << Math.min(sourceIndex, 17),
      dropable: false,
      pickpocketable: false,
    }))],
    ["non-sequential source ordinal", [{ ...rightHand, sourceIndex: 1 }]],
    ["unknown slot mask", [{ ...rightHand, slotMask: 3 }]],
    ["duplicate physical slot", [rightHand, { ...head, slotMask: 0x10 }]],
    ["invalid ResRef", [{ ...rightHand, resRef: "bad-item" }]],
    ["missing flag", [{
      sourceIndex: 0,
      resRef: "nw_wswmls001",
      slotMask: 0x10,
      dropable: false,
    }]],
    ["non-boolean flag", [{ ...rightHand, dropable: 0 }]],
    ["Infinite flag", [{ ...rightHand, infinite: false }]],
    ["Droppable alias", [{ ...rightHand, droppable: false }]],
  ])("rejects a %s source list", (_label, input) => {
    expect(() => parseAreaCreatureEquipmentSourceEntries(
      input,
      "equipment.expectedEntries",
    )).toThrow(AreaCreatureEquipmentValidationError);
  });

  it.each([
    ["new entry", [{
      resRef: "nw_helm001",
      slotMask: 0x1,
      dropable: false,
      pickpocketable: false,
    }]],
    ["duplicate source ordinal", [head, head]],
    ["missing source ordinal", [{ ...rightHand, sourceIndex: 9 }]],
    ["identity change", [{ ...rightHand, resRef: "nw_dagger001" }]],
    ["slot reassignment", [{ ...rightHand, slotMask: 0x20 }]],
    ["noncanonical target order", [rightHand, head]],
    ["Infinite flag", [{ ...rightHand, infinite: false }]],
    ["unknown field", [{ ...rightHand, randomResRef: "rnd_weapon" }]],
  ])("rejects a %s target", (_label, input) => {
    expect(() => parseAreaCreatureEquipmentTargetEntries(
      input,
      [rightHand, head],
      "equipment.entries",
    )).toThrow(AreaCreatureEquipmentValidationError);
  });

  it("parses only one exact complete expected/target pair", () => {
    expect(parseAreaCreatureEquipmentMutation({
      expectedEntries: [rightHand],
      entries: [{ ...rightHand, dropable: true }],
    }, "equipment")).toEqual({
      expectedEntries: [rightHand],
      entries: [{ ...rightHand, dropable: true }],
    });
    expect(() => parseAreaCreatureEquipmentMutation({
      expectedEntries: [rightHand],
      entries: [],
      extra: true,
    }, "equipment")).toThrow(AreaCreatureEquipmentValidationError);
  });

  it("compares source identity, slot, order, and both flags", () => {
    expect(areaCreatureEquipmentEntriesEqual([rightHand], [{ ...rightHand }])).toBe(true);
    expect(areaCreatureEquipmentEntriesEqual([rightHand], [{
      ...rightHand,
      dropable: true,
    }])).toBe(false);
    expect(areaCreatureEquipmentEntriesEqual([head, rightHand], [rightHand, head])).toBe(false);
  });
});
