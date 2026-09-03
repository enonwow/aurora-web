import { describe, expect, it } from "vitest";
import {
  PLACEABLE_INVENTORY_COORDINATE_MAX,
  PLACEABLE_INVENTORY_SOURCE_PAYLOAD_MAX_UNITS,
  canEditExistingPlaceableInventory,
  createAdmittedPlaceableInventoryItem,
  movePlaceableInventoryEntry,
  normalizePlaceableInventoryCoordinate,
  readPlaceableInventorySourceEntries
} from "../../../../../src/modules/scene/domain/placeableInventory";

describe("placeableInventory", () => {
  const exactSingleEntryPayload = JSON.stringify([
    { sourceIndex: 0, resRef: "nw_cloth022", x: 0, y: 0 }
  ]);

  it("maps exact native source entries", () => {
    const entries = readPlaceableInventorySourceEntries(
      JSON.stringify([
        {
          sourceIndex: 0,
          resRef: "s03proofamuletr2",
          x: 3,
          y: 4
        },
        {
          sourceIndex: 1,
          resRef: "nw_cloth022",
          x: 0,
          y: PLACEABLE_INVENTORY_COORDINATE_MAX
        }
      ])
    );

    expect(entries).toEqual([
      { sourceIndex: 0, resRef: "s03proofamuletr2", x: 3, y: 4 },
      {
        sourceIndex: 1,
        resRef: "nw_cloth022",
        x: 0,
        y: PLACEABLE_INVENTORY_COORDINATE_MAX
      }
    ]);
    expect(Object.isFrozen(entries)).toBe(true);
    expect(Object.isFrozen(entries?.[0])).toBe(true);
  });

  it.each([
    ["missing list", undefined],
    [
      "non-string payload",
      { toString: () => exactSingleEntryPayload }
    ],
    ["empty payload", ""],
    [
      "payload over 1024 units",
      exactSingleEntryPayload.padEnd(PLACEABLE_INVENTORY_SOURCE_PAYLOAD_MAX_UNITS + 1, " ")
    ],
    ["invalid JSON", "{"],
    ["non-array JSON", "{}"],
    ["null entry", JSON.stringify([null])],
    ["array entry", JSON.stringify([[]])],
    ["primitive entry", JSON.stringify([1])],
    ["missing source ordinal", JSON.stringify([{ resRef: "nw_cloth022", x: 0, y: 0 }])],
    [
      "negative source ordinal",
      JSON.stringify([{ sourceIndex: -1, resRef: "nw_cloth022", x: 0, y: 0 }])
    ],
    [
      "fractional source ordinal",
      JSON.stringify([{ sourceIndex: 0.5, resRef: "nw_cloth022", x: 0, y: 0 }])
    ],
    [
      "string source ordinal",
      JSON.stringify([{ sourceIndex: "0", resRef: "nw_cloth022", x: 0, y: 0 }])
    ],
    [
      "duplicate source ordinal",
      JSON.stringify([
        { sourceIndex: 0, resRef: "nw_cloth022", x: 0, y: 0 },
        { sourceIndex: 0, resRef: "nw_cloth022", x: 1, y: 0 }
      ])
    ],
    [
      "sparse source ordinal",
      JSON.stringify([{ sourceIndex: 1, resRef: "nw_cloth022", x: 0, y: 0 }])
    ],
    [
      "reordered source ordinals",
      JSON.stringify([
        { sourceIndex: 1, resRef: "nw_cloth022", x: 0, y: 0 },
        { sourceIndex: 0, resRef: "nw_cloth022", x: 1, y: 0 }
      ])
    ],
    [
      "unsupported mode-2 flag",
      JSON.stringify([
        { sourceIndex: 0, resRef: "nw_cloth022", x: 0, y: 0, dropable: true }
      ])
    ],
    [
      "random inventory field",
      JSON.stringify([
        { sourceIndex: 0, resRef: "nw_cloth022", x: 0, y: 0, randomResRef: "rnd" }
      ])
    ],
    [
      "unknown field",
      JSON.stringify([
        { sourceIndex: 0, resRef: "nw_cloth022", x: 0, y: 0, unknown: 1 }
      ])
    ],
    [
      "invalid ResRef",
      JSON.stringify([{ sourceIndex: 0, resRef: "bad-resref", x: 0, y: 0 }])
    ],
    ["empty ResRef", JSON.stringify([{ sourceIndex: 0, resRef: "", x: 0, y: 0 }])],
    [
      "non-string ResRef",
      JSON.stringify([{ sourceIndex: 0, resRef: 22, x: 0, y: 0 }])
    ],
    [
      "negative coordinates",
      JSON.stringify([{ sourceIndex: 0, resRef: "nw_cloth022", x: -1, y: 0 }])
    ],
    [
      "fractional coordinates",
      JSON.stringify([{ sourceIndex: 0, resRef: "nw_cloth022", x: 0.5, y: 0 }])
    ],
    [
      "out-of-range coordinates",
      JSON.stringify([{ sourceIndex: 0, resRef: "nw_cloth022", x: 65536, y: 0 }])
    ],
    [
      "out-of-range y coordinate",
      JSON.stringify([{ sourceIndex: 0, resRef: "nw_cloth022", x: 0, y: 65536 }])
    ]
  ])("fails closed for %s", (_label, value) => {
    expect(readPlaceableInventorySourceEntries(value)).toBeUndefined();
  });

  it("accepts the exact 1024-unit source payload boundary", () => {
    const value = exactSingleEntryPayload.padEnd(
      PLACEABLE_INVENTORY_SOURCE_PAYLOAD_MAX_UNITS,
      " "
    );
    expect(readPlaceableInventorySourceEntries(value)).toEqual([
      { sourceIndex: 0, resRef: "nw_cloth022", x: 0, y: 0 }
    ]);
  });

  it("creates only the exact admitted immutable UTI target", () => {
    expect(createAdmittedPlaceableInventoryItem()).toEqual({
      resRef: "nw_cloth022",
      itemResRef: "nw_cloth022",
      itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
      itemSourceFingerprint:
        "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
      x: 0,
      y: 0
    });
  });

  it("keeps repository coordinates inside the native Word range", () => {
    expect(normalizePlaceableInventoryCoordinate(-1)).toBe(0);
    expect(normalizePlaceableInventoryCoordinate(12.9)).toBe(12);
    expect(normalizePlaceableInventoryCoordinate(PLACEABLE_INVENTORY_COORDINATE_MAX + 1)).toBe(
      PLACEABLE_INVENTORY_COORDINATE_MAX
    );
    expect(normalizePlaceableInventoryCoordinate(Number.NaN)).toBe(0);
  });

  it("moves entries only within the exact target order", () => {
    const entries = ["first", "second", "third"];
    expect(movePlaceableInventoryEntry(entries, 0, "down")).toEqual([
      "second",
      "first",
      "third"
    ]);
    expect(movePlaceableInventoryEntry(entries, 2, "up")).toEqual([
      "first",
      "third",
      "second"
    ]);
    expect(movePlaceableInventoryEntry(entries, 1, "up")).toEqual([
      "second",
      "first",
      "third"
    ]);
    const unchanged = movePlaceableInventoryEntry(entries, 0, "up");
    expect(unchanged).toEqual(entries);
    expect(unchanged).not.toBe(entries);
    expect(movePlaceableInventoryEntry(entries, -1, "down")).toEqual(entries);
    expect(movePlaceableInventoryEntry(entries, entries.length, "up")).toEqual(entries);
    expect(movePlaceableInventoryEntry(entries, entries.length - 1, "down")).toEqual(entries);
  });

  it("admits editing only for exact existing Placeable provenance", () => {
    const source = {
      type: "aurora_git" as const,
      sourceKind: "placeable" as const,
      sourceObjectId: "plc:0:plc_flrlever1:source",
      placeableInventoryItems: []
    };

    expect(canEditExistingPlaceableInventory(source)).toBe(true);
    expect(canEditExistingPlaceableInventory({ ...source, type: "seed" })).toBe(false);
    expect(canEditExistingPlaceableInventory({ ...source, sourceKind: "creature" })).toBe(false);
    expect(canEditExistingPlaceableInventory({ ...source, sourceObjectId: "" })).toBe(false);
    expect(
      canEditExistingPlaceableInventory({
        ...source,
        sourceObjectId: 7
      } as never)
    ).toBe(false);
    expect(
      canEditExistingPlaceableInventory({
        ...source,
        sourceObjectId: { length: 1 }
      } as never)
    ).toBe(false);
    expect(
      canEditExistingPlaceableInventory({
        type: "aurora_git",
        sourceKind: "placeable",
        sourceObjectId: source.sourceObjectId
      })
    ).toBe(false);
  });
});
