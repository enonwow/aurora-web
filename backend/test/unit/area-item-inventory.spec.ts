import {
  AreaItemInventoryValidationError,
  areaItemInventoryEntriesEqual,
  parseAreaItemInventoryMutation,
  parseAreaItemInventorySourceEntries,
  parseAreaItemInventoryTargetEntries,
} from "../../src/modules/areas/domain/area-item-inventory";

describe("retained ground-Item ItemList domain", () => {
  const source = Object.freeze([
    Object.freeze({ sourceIndex: 0, resRef: "nested_a", x: 1, y: 2 }),
    Object.freeze({ sourceIndex: 1, resRef: "nested_b", x: 3, y: 4 }),
  ]);
  const dynamicBlueprint = Object.freeze({
    resRef: "nested_c",
    itemTemplateId: "itm_nested_c",
    itemResRef: "nested_c",
    itemSourceProfileId: "effective-catalog-uti-item-copy-v1",
    itemSourceObjectKey: "modules/current/items/nested_c.uti",
    itemSourceSizeBytes: 4096,
    itemSourceFingerprint: "a".repeat(64),
    itemTag: "NESTED_C",
    x: 5,
    y: 6,
  });

  it("accepts exact source entries and a reordered coordinate-changing retained target", () => {
    const expectedEntries = parseAreaItemInventorySourceEntries(source, "source");
    const entries = parseAreaItemInventoryTargetEntries([
      { sourceIndex: 1, resRef: "nested_b", x: 30, y: 40 },
      { sourceIndex: 0, resRef: "nested_a", x: 10, y: 20 },
    ], expectedEntries, "target");

    expect(entries).toEqual([
      { sourceIndex: 1, resRef: "nested_b", x: 30, y: 40 },
      { sourceIndex: 0, resRef: "nested_a", x: 10, y: 20 },
    ]);
    expect(areaItemInventoryEntriesEqual(expectedEntries, entries)).toBe(false);
    expect(parseAreaItemInventoryMutation({
      expectedEntries: source,
      entries,
    }, "inventory")).toEqual({ expectedEntries, entries });
  });

  it("accepts exact absence and retained removal", () => {
    expect(parseAreaItemInventorySourceEntries([], "source")).toEqual([]);
    expect(parseAreaItemInventoryTargetEntries([], source, "target")).toEqual([]);
  });

  it("accepts exact dynamic blueprint entries interleaved with retained entries", () => {
    const entries = parseAreaItemInventoryTargetEntries([
      dynamicBlueprint,
      { sourceIndex: 1, resRef: "nested_b", x: 30, y: 40 },
    ], source, "target");

    expect(entries).toEqual([
      dynamicBlueprint,
      { sourceIndex: 1, resRef: "nested_b", x: 30, y: 40 },
    ]);
    expect(areaItemInventoryEntriesEqual(source, entries)).toBe(false);
  });

  it.each([
    ["unknown field", [{ sourceIndex: 0, resRef: "nested_a", x: 1, y: 2, infinite: false }]],
    ["missing field", [{ sourceIndex: 0, resRef: "nested_a", x: 1 }]],
    ["noncanonical source ordinal", [{ sourceIndex: 1, resRef: "nested_a", x: 1, y: 2 }]],
    ["invalid ResRef", [{ sourceIndex: 0, resRef: "nested-a", x: 1, y: 2 }]],
    ["negative Word", [{ sourceIndex: 0, resRef: "nested_a", x: -1, y: 2 }]],
    ["overflow Word", [{ sourceIndex: 0, resRef: "nested_a", x: 1, y: 0x10000 }]],
  ])("rejects a source with %s", (_label, value) => {
    expect(() => parseAreaItemInventorySourceEntries(value, "source")).toThrow(
      AreaItemInventoryValidationError,
    );
  });

  it.each([
    ["duplicate source", [source[0], source[0]]],
    ["missing source", [{ sourceIndex: 2, resRef: "nested_c", x: 1, y: 2 }]],
    ["changed identity", [{ sourceIndex: 0, resRef: "nested_b", x: 1, y: 2 }]],
    ["new entry", [{ resRef: "nested_c", x: 1, y: 2 }]],
    ["partial dynamic entry", [{ ...dynamicBlueprint, itemSourceSizeBytes: undefined }]],
    ["mixed retained and dynamic entry", [{ ...dynamicBlueprint, sourceIndex: 0 }]],
    ["mismatched dynamic ResRef", [{ ...dynamicBlueprint, itemResRef: "nested_d" }]],
    ["noncanonical dynamic ResRef", [{ ...dynamicBlueprint, resRef: "NESTED_C", itemResRef: "NESTED_C" }]],
    ["wrong dynamic profile", [{ ...dynamicBlueprint, itemSourceProfileId: "other-profile" }]],
    ["invalid dynamic digest", [{ ...dynamicBlueprint, itemSourceFingerprint: "A".repeat(64) }]],
    ["invalid dynamic size", [{ ...dynamicBlueprint, itemSourceSizeBytes: 1024 * 1024 + 1 }]],
    ["invalid dynamic tag", [{ ...dynamicBlueprint, itemTag: "bad\0tag" }]],
    ["mode flag", [{ ...source[0], dropable: false }]],
  ])("rejects a target with %s", (_label, value) => {
    expect(() => parseAreaItemInventoryTargetEntries(value, source, "target")).toThrow(
      AreaItemInventoryValidationError,
    );
  });

  it("enforces the 1024-entry budget", () => {
    expect(() => parseAreaItemInventorySourceEntries(
      Array.from({ length: 1025 }, (_, sourceIndex) => ({
        sourceIndex,
        resRef: `item_${sourceIndex}`.slice(0, 16),
        x: 0,
        y: 0,
      })),
      "source",
    )).toThrow(AreaItemInventoryValidationError);
  });
});
