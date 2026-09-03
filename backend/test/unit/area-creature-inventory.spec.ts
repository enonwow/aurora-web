import { AREA_ITEM_CONSTRUCTION_PROFILE } from "../../src/modules/areas/domain/area-item-construction-profile";
import {
  AreaCreatureInventoryValidationError,
  areaCreatureInventoryEntriesEqual,
  parseAreaCreatureInventoryMutation,
  parseAreaCreatureInventorySourceEntries,
  parseAreaCreatureInventoryTargetEntries,
} from "../../src/modules/areas/domain/area-creature-inventory";

describe("Creature ItemList domain validation", () => {
  const retained = Object.freeze({
    sourceIndex: 0,
    resRef: "nw_sword",
    x: 0,
    y: 1,
    dropable: false,
    pickpocketable: true,
  });
  const admitted = Object.freeze({
    resRef: AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef,
    itemResRef: AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef,
    itemSourceObjectKey: AREA_ITEM_CONSTRUCTION_PROFILE.id,
    itemSourceFingerprint: AREA_ITEM_CONSTRUCTION_PROFILE.sourceSha256,
    x: 2,
    y: 3,
    dropable: false,
    pickpocketable: false,
  });

  it("parses and freezes exact mode-0 source and target entries", () => {
    const expectedEntries = parseAreaCreatureInventorySourceEntries([retained], "source");
    const entries = parseAreaCreatureInventoryTargetEntries([
      { ...retained, x: 4, dropable: true, pickpocketable: false },
      admitted,
    ], expectedEntries, "target");

    expect(entries).toEqual([
      { ...retained, x: 4, dropable: true, pickpocketable: false },
      admitted,
    ]);
    expect(Object.isFrozen(expectedEntries)).toBe(true);
    expect(Object.isFrozen(entries)).toBe(true);
    expect(Object.isFrozen(entries[0])).toBe(true);
  });

  it("accepts the exact 1024-entry source and target budgets", () => {
    const source = parseAreaCreatureInventorySourceEntries(
      Array.from({ length: 1024 }, (_, sourceIndex) => ({
        sourceIndex,
        resRef: "item",
        x: sourceIndex,
        y: 0xffff,
        dropable: false,
        pickpocketable: false,
      })),
      "source",
    );
    expect(source).toHaveLength(1024);
    expect(parseAreaCreatureInventoryTargetEntries(
      Array.from({ length: 1024 }, () => admitted),
      [],
      "target",
    )).toHaveLength(1024);
  });

  it.each([
    ["non-array", null],
    ["oversized", Array.from({ length: 1025 }, (_, sourceIndex) => ({
      sourceIndex,
      resRef: "item",
      x: 0,
      y: 0,
      dropable: false,
      pickpocketable: false,
    }))],
    ["non-sequential ordinal", [{ ...retained, sourceIndex: 1 }]],
    ["invalid ResRef", [{ ...retained, resRef: "bad-item" }]],
    ["missing flag", [{
      sourceIndex: 0,
      resRef: "item",
      x: 0,
      y: 0,
      dropable: false,
    }]],
    ["non-boolean flag", [{ ...retained, dropable: 0 }]],
    ["Infinite flag", [{ ...retained, infinite: false }]],
    ["Droppable alias", [{ ...retained, droppable: false }]],
    ["oversized Word", [{ ...retained, y: 0x10000 }]],
  ])("rejects a %s source list", (_label, input) => {
    expect(() => parseAreaCreatureInventorySourceEntries(input, "source"))
      .toThrow(AreaCreatureInventoryValidationError);
  });

  it.each([
    ["duplicate retained ordinal", [retained, retained], [retained]],
    ["missing retained source", [retained], []],
    ["changed retained identity", [{ ...retained, resRef: "other" }], [retained]],
    ["Infinite flag", [{ ...retained, infinite: false }], [retained]],
    ["Droppable alias", [{ ...retained, droppable: false }], [retained]],
    ["unadmitted ResRef", [{ ...admitted, resRef: "other" }], []],
    ["unadmitted item ResRef", [{ ...admitted, itemResRef: "other" }], []],
    ["unadmitted profile", [{ ...admitted, itemSourceObjectKey: "other" }], []],
    ["unadmitted fingerprint", [{
      ...admitted,
      itemSourceFingerprint: "f".repeat(64),
    }], []],
  ])("rejects a %s target list", (_label, input, source) => {
    expect(() => parseAreaCreatureInventoryTargetEntries(input, source, "target"))
      .toThrow(AreaCreatureInventoryValidationError);
  });

  it("compares coordinates, flags, source identity, and blueprint provenance", () => {
    expect(areaCreatureInventoryEntriesEqual([retained], [{ ...retained }])).toBe(true);
    expect(areaCreatureInventoryEntriesEqual([retained], [{
      ...retained,
      pickpocketable: false,
    }])).toBe(false);
    expect(areaCreatureInventoryEntriesEqual([admitted], [{ ...admitted }])).toBe(true);
    expect(areaCreatureInventoryEntriesEqual([admitted], [{
      ...admitted,
      itemSourceFingerprint: "f".repeat(64),
    }])).toBe(false);
  });

  it("parses only an exact complete mutation pair", () => {
    expect(parseAreaCreatureInventoryMutation({
      expectedEntries: [retained],
      entries: [{ ...retained, dropable: true }],
    }, "inventory")).toEqual({
      expectedEntries: [retained],
      entries: [{ ...retained, dropable: true }],
    });
    expect(() => parseAreaCreatureInventoryMutation({
      expectedEntries: [retained],
      entries: [retained],
      extra: true,
    }, "inventory")).toThrow(AreaCreatureInventoryValidationError);
  });
});
