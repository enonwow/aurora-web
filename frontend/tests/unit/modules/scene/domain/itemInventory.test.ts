import { describe, expect, it } from "vitest";
import {
  itemInventoryEntriesEqual,
  readItemInventorySourceEntries,
  readItemInventoryTargetEntries,
} from "../../../../../src/modules/scene/domain/itemInventory";

const source = [
  { sourceIndex: 0, resRef: "nw_it_gold001", x: 1, y: 2 },
  { sourceIndex: 1, resRef: "nw_it_gem001", x: 3, y: 4 },
] as const;
const dynamicBlueprint = {
  resRef: "nw_cloth022",
  itemTemplateId: "itm_nw_cloth022",
  itemResRef: "nw_cloth022",
  itemSourceProfileId: "effective-catalog-uti-item-copy-v1",
  itemSourceObjectKey: "modules/current/items/nw_cloth022.uti",
  itemSourceSizeBytes: 4096,
  itemSourceFingerprint: "a".repeat(64),
  itemTag: "NW_CLOTH022",
  x: 5,
  y: 6,
} as const;

describe("itemInventory", () => {
  it("reads an exact ordered retained ground-Item inventory source", () => {
    expect(readItemInventorySourceEntries(source)).toEqual(source);
    expect(readItemInventorySourceEntries([])).toEqual([]);
  });

  it.each([
    ["non-array", null],
    ["non-physical ordinal", [{ ...source[0], sourceIndex: 1 }]],
    ["identity alias", [{ ...source[0], templateResRef: source[0].resRef }]],
    ["coordinate alias", [{ ...source[0], reposX: source[0].x }]],
    ["mode flag", [{ ...source[0], infinite: false }]],
    ["invalid ResRef", [{ ...source[0], resRef: "bad resref" }]],
    ["non-Word coordinate", [{ ...source[0], x: 65_536 }]],
  ])("rejects %s in source provenance", (_label, value) => {
    expect(readItemInventorySourceEntries(value)).toBeNull();
  });

  it("reads retained-only targets with reorder, coordinate change, and removal", () => {
    expect(readItemInventoryTargetEntries([
      { ...source[1], x: 12, y: 13 },
    ], source)).toEqual([
      { sourceIndex: 1, resRef: "nw_it_gem001", x: 12, y: 13 },
    ]);
  });

  it("reads an exact dynamic UTI target interleaved with a retained target", () => {
    expect(readItemInventoryTargetEntries([
      dynamicBlueprint,
      { ...source[1], x: 12, y: 13 },
    ], source)).toEqual([
      dynamicBlueprint,
      { sourceIndex: 1, resRef: "nw_it_gem001", x: 12, y: 13 },
    ]);
  });

  it.each([
    ["new source ordinal", [{ sourceIndex: 2, resRef: "new_item", x: 0, y: 0 }]],
    ["changed identity", [{ ...source[0], resRef: source[1].resRef }]],
    ["duplicate retained source", [source[0], source[0]]],
    ["loose ResRef-only addition", [{ resRef: "nw_cloth022", x: 0, y: 0 }]],
    ["partial dynamic addition", [{ ...dynamicBlueprint, itemSourceSizeBytes: undefined }]],
    ["mixed retained/dynamic addition", [{ ...dynamicBlueprint, sourceIndex: 0 }]],
    ["mismatched dynamic identity", [{ ...dynamicBlueprint, itemResRef: "other_item" }]],
    ["noncanonical dynamic ResRef", [{ ...dynamicBlueprint, resRef: "NW_CLOTH022", itemResRef: "NW_CLOTH022" }]],
    ["wrong dynamic profile", [{ ...dynamicBlueprint, itemSourceProfileId: "other-profile" }]],
    ["noncanonical target field", [{ ...source[0], dropable: true }]],
  ])("rejects a %s target", (_label, value) => {
    expect(readItemInventoryTargetEntries(value, source)).toBeNull();
  });

  it("compares order and every native retained field", () => {
    expect(itemInventoryEntriesEqual(source, source)).toBe(true);
    expect(itemInventoryEntriesEqual(source, [...source].reverse())).toBe(false);
    expect(itemInventoryEntriesEqual(source, [source[0], { ...source[1], y: 5 }])).toBe(false);
    expect(itemInventoryEntriesEqual([dynamicBlueprint], [{ ...dynamicBlueprint }])).toBe(true);
    expect(itemInventoryEntriesEqual([dynamicBlueprint], [{ ...dynamicBlueprint, y: 7 }])).toBe(false);
  });
});
