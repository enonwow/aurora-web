import { describe, expect, it } from "vitest";
import {
  CREATURE_INVENTORY_COORDINATE_MAX,
  CREATURE_INVENTORY_ENTRY_MAX,
  canEditExistingCreatureInventory,
  createAdmittedCreatureInventoryItem,
  moveCreatureInventoryEntry,
  normalizeCreatureInventoryCoordinate,
  readCreatureInventorySourceEntries,
  readCreatureInventoryTargetEntries
} from "../../../../../src/modules/scene/domain/creatureInventory";

describe("creatureInventory", () => {
  const sourceEntries = [
    {
      sourceIndex: 0,
      resRef: "nw_it_potion",
      x: 3,
      y: 4,
      dropable: true,
      pickpocketable: false
    },
    {
      sourceIndex: 1,
      resRef: "nw_cloth022",
      x: 0,
      y: CREATURE_INVENTORY_COORDINATE_MAX,
      dropable: false,
      pickpocketable: true
    }
  ] as const;

  it("reads and freezes the exact mode-0 native source contract", () => {
    const entries = readCreatureInventorySourceEntries(
      JSON.stringify(sourceEntries),
      sourceEntries.length
    );

    expect(entries).toEqual(sourceEntries);
    expect(Object.isFrozen(entries)).toBe(true);
    expect(Object.isFrozen(entries?.[0])).toBe(true);
  });

  it("accepts the canonical empty ItemList projection", () => {
    expect(readCreatureInventorySourceEntries("[]", 0)).toEqual([]);
  });

  it.each([
    ["missing count", JSON.stringify(sourceEntries), undefined],
    ["fractional count", JSON.stringify(sourceEntries), 2.5],
    ["count mismatch", JSON.stringify(sourceEntries), 1],
    ["invalid JSON", "{", 0],
    ["non-array JSON", "{}", 0],
    ["null entry", "[null]", 1],
    [
      "missing flag",
      JSON.stringify([{ sourceIndex: 0, resRef: "nw_cloth022", x: 0, y: 0, dropable: false }]),
      1
    ],
    [
      "unsupported Infinite",
      JSON.stringify([
        {
          sourceIndex: 0,
          resRef: "nw_cloth022",
          x: 0,
          y: 0,
          dropable: false,
          pickpocketable: false,
          infinite: false
        }
      ]),
      1
    ],
    [
      "unsupported Droppable alias",
      JSON.stringify([
        {
          sourceIndex: 0,
          resRef: "nw_cloth022",
          x: 0,
          y: 0,
          dropable: false,
          pickpocketable: false,
          droppable: false
        }
      ]),
      1
    ],
    [
      "sparse ordinal",
      JSON.stringify([
        {
          sourceIndex: 1,
          resRef: "nw_cloth022",
          x: 0,
          y: 0,
          dropable: false,
          pickpocketable: false
        }
      ]),
      1
    ],
    [
      "bad ResRef",
      JSON.stringify([
        {
          sourceIndex: 0,
          resRef: "bad-resref",
          x: 0,
          y: 0,
          dropable: false,
          pickpocketable: false
        }
      ]),
      1
    ],
    [
      "coordinate outside Word",
      JSON.stringify([
        {
          sourceIndex: 0,
          resRef: "nw_cloth022",
          x: 0,
          y: CREATURE_INVENTORY_COORDINATE_MAX + 1,
          dropable: false,
          pickpocketable: false
        }
      ]),
      1
    ]
  ])("fails closed for %s", (_label, payload, count) => {
    expect(readCreatureInventorySourceEntries(payload, count)).toBeUndefined();
  });

  it("rejects a source array above the 1024-entry budget", () => {
    const overBudget = Array.from({ length: CREATURE_INVENTORY_ENTRY_MAX + 1 }, (_, sourceIndex) => ({
      sourceIndex,
      resRef: "nw_cloth022",
      x: 0,
      y: 0,
      dropable: false,
      pickpocketable: false
    }));
    expect(readCreatureInventorySourceEntries(JSON.stringify(overBudget), overBudget.length)).toBeUndefined();
  });

  it("reads reordered retained entries and the one admitted immutable UTI", () => {
    const admittedBlueprint = createAdmittedCreatureInventoryItem();
    const target = readCreatureInventoryTargetEntries(
      [
        { ...sourceEntries[1], x: 7, y: 8 },
        admittedBlueprint,
        { ...sourceEntries[0], dropable: false, pickpocketable: true }
      ],
      sourceEntries
    );

    expect(target).toEqual([
      { ...sourceEntries[1], x: 7, y: 8 },
      admittedBlueprint,
      { ...sourceEntries[0], dropable: false, pickpocketable: true }
    ]);
    expect(Object.isFrozen(target)).toBe(true);
    expect(Object.isFrozen(target?.[0])).toBe(true);
  });

  it.each([
    ["duplicate retained ordinal", [{ ...sourceEntries[0] }, { ...sourceEntries[0] }]],
    ["changed retained identity", [{ ...sourceEntries[0], resRef: "nw_cloth022" }]],
    ["missing retained source", [{ ...sourceEntries[0], sourceIndex: 9 }]],
    ["legacy random inventory", [{ ...sourceEntries[0], randomResRef: "rnd" }]],
    ["Infinite", [{ ...sourceEntries[0], infinite: false }]],
    ["arbitrary new item", [{ ...createAdmittedCreatureInventoryItem(), resRef: "nw_it_potion" }]],
    ["wrong blueprint hash", [{ ...createAdmittedCreatureInventoryItem(), itemSourceFingerprint: "0".repeat(64) }]]
  ])("rejects target state containing %s", (_label, value) => {
    expect(readCreatureInventoryTargetEntries(value, sourceEntries)).toBeUndefined();
  });

  it("creates only the exact admitted mode-0 UTI target", () => {
    expect(createAdmittedCreatureInventoryItem()).toEqual({
      resRef: "nw_cloth022",
      itemResRef: "nw_cloth022",
      itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
      itemSourceFingerprint:
        "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
      x: 0,
      y: 0,
      dropable: false,
      pickpocketable: false
    });
  });

  it("admits editing only for an ordinal-bound existing Creature", () => {
    const source = {
      type: "aurora_git" as const,
      sourceKind: "creature" as const,
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureInventoryItems: sourceEntries
    };
    expect(canEditExistingCreatureInventory(source)).toBe(true);
    expect(canEditExistingCreatureInventory({ ...source, type: "seed" })).toBe(false);
    expect(canEditExistingCreatureInventory({ ...source, sourceKind: "placeable" })).toBe(false);
    expect(canEditExistingCreatureInventory({ ...source, sourceObjectId: "" })).toBe(false);
    expect(canEditExistingCreatureInventory({ ...source, sourceIndex: -1 })).toBe(false);
    expect(canEditExistingCreatureInventory({ ...source, sourceIndex: 0.5 })).toBe(false);
    expect(canEditExistingCreatureInventory({
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: source.sourceObjectId,
      sourceIndex: 0
    })).toBe(false);
  });

  it("normalizes Word coordinates and moves only inside the ordered target", () => {
    expect(normalizeCreatureInventoryCoordinate(-1)).toBe(0);
    expect(normalizeCreatureInventoryCoordinate(12.9)).toBe(12);
    expect(normalizeCreatureInventoryCoordinate(CREATURE_INVENTORY_COORDINATE_MAX + 1)).toBe(
      CREATURE_INVENTORY_COORDINATE_MAX
    );
    expect(normalizeCreatureInventoryCoordinate(Number.NaN)).toBe(0);
    expect(moveCreatureInventoryEntry(["first", "second"], 0, "down")).toEqual([
      "second",
      "first"
    ]);
    expect(moveCreatureInventoryEntry(["first", "second"], 0, "up")).toEqual([
      "first",
      "second"
    ]);
  });
});
