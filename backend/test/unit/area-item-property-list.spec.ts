import {
  MAX_AREA_ITEM_PROPERTY_LIST_ENTRIES,
  AreaItemPropertyListValidationError,
  areaItemPropertyListEntriesEqual,
  areaItemPropertyListSourceEntriesEqual,
  parseAreaItemPropertyListMutation,
  parseAreaItemPropertyListProvenance,
  parseAreaItemPropertyListSourceEntries,
  parseAreaItemPropertyListTargetEntries,
} from "../../src/modules/areas/domain/area-item-property-list";

const entry = (overrides: Record<string, unknown> = {}) => ({
  propertyName: 1,
  subtype: 0xffff,
  costTable: 2,
  costValue: 3,
  param1: 0xff,
  param1Value: 0,
  chanceAppear: 100,
  ...overrides,
});

describe("Area Item PropertiesList domain", () => {
  it("parses and freezes an ordered duplicate-preserving source vector", () => {
    const value = parseAreaItemPropertyListSourceEntries([
      { sourceIndex: 0, ...entry() },
      { sourceIndex: 1, ...entry() },
    ]);

    expect(value).toEqual([
      { sourceIndex: 0, ...entry() },
      { sourceIndex: 1, ...entry() },
    ]);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value[0])).toBe(true);
  });

  it("parses the complete target native ranges", () => {
    expect(parseAreaItemPropertyListTargetEntries([entry({
      propertyName: 0xffff,
      subtype: 0,
      costTable: 0xff,
      costValue: 0xffff,
      param1: 0,
      param1Value: 0xff,
      chanceAppear: 0xff,
    })])).toEqual([entry({
      propertyName: 0xffff,
      subtype: 0,
      costTable: 0xff,
      costValue: 0xffff,
      param1: 0,
      param1Value: 0xff,
      chanceAppear: 0xff,
    })]);
  });

  it.each([
    ["missing field", (() => { const value = entry(); delete value.param1; return value; })()],
    ["extra field", entry({ label: "not persistence authority" })],
    ["noninteger", entry({ costValue: 1.5 })],
    ["negative Word", entry({ propertyName: -1 })],
    ["overflow Word", entry({ subtype: 0x1_0000 })],
    ["overflow Byte", entry({ param1Value: 0x100 })],
  ])("rejects %s", (_label, value) => {
    expect(() => parseAreaItemPropertyListTargetEntries([value]))
      .toThrow(AreaItemPropertyListValidationError);
  });

  it("enforces Aurora's property-48 CostTable-24 normalization invariant", () => {
    expect(parseAreaItemPropertyListTargetEntries([
      entry({ propertyName: 48, costTable: 24 }),
    ])).toHaveLength(1);
    expect(() => parseAreaItemPropertyListTargetEntries([
      entry({ propertyName: 48, costTable: 23 }),
    ])).toThrow("propertiesList.0:property_48_requires_cost_table_24");
  });

  it("rejects nonsequential source ordinals", () => {
    expect(() => parseAreaItemPropertyListSourceEntries([
      { sourceIndex: 1, ...entry() },
    ])).toThrow("propertiesList.0:invalid_source_index");
  });

  it("enforces the inline entry budget", () => {
    const oversized = Array.from(
      { length: MAX_AREA_ITEM_PROPERTY_LIST_ENTRIES + 1 },
      () => entry(),
    );
    expect(() => parseAreaItemPropertyListTargetEntries(oversized))
      .toThrow(`propertiesList:maximum_${MAX_AREA_ITEM_PROPERTY_LIST_ENTRIES}`);
  });

  it("represents physical absence but never permits absent-list mutation", () => {
    expect(parseAreaItemPropertyListProvenance({
      present: false,
      expectedEntries: [],
    })).toEqual({ present: false, expectedEntries: [] });
    expect(() => parseAreaItemPropertyListProvenance({
      present: false,
      expectedEntries: [{ sourceIndex: 0, ...entry() }],
    })).toThrow("propertiesList:absent_with_entries");
    expect(() => parseAreaItemPropertyListMutation({
      expectedValue: { present: false, expectedEntries: [] },
      entries: [entry()],
    })).toThrow("propertiesList:source_absent");
  });

  it("accepts add, update, remove and reorder as full-vector mutations", () => {
    const expectedValue = {
      present: true,
      expectedEntries: [
        { sourceIndex: 0, ...entry({ propertyName: 1 }) },
        { sourceIndex: 1, ...entry({ propertyName: 2 }) },
      ],
    };
    expect(parseAreaItemPropertyListMutation({
      expectedValue,
      entries: [entry({ propertyName: 2 }), entry({ propertyName: 1 })],
    }).entries.map((value) => value.propertyName)).toEqual([2, 1]);
    expect(parseAreaItemPropertyListMutation({
      expectedValue,
      entries: [],
    }).entries).toEqual([]);
    expect(parseAreaItemPropertyListMutation({
      expectedValue,
      entries: [...expectedValue.expectedEntries.map(({ sourceIndex: _, ...value }) => value), entry()],
    }).entries).toHaveLength(3);
  });

  it("rejects a no-op mutation", () => {
    const expectedEntries = [{ sourceIndex: 0, ...entry() }];
    expect(() => parseAreaItemPropertyListMutation({
      expectedValue: { present: true, expectedEntries },
      entries: [entry()],
    })).toThrow("propertiesList:unchanged");
  });

  it("compares values separately from exact source ordinals", () => {
    const source = [{ sourceIndex: 0, ...entry() }];
    expect(areaItemPropertyListEntriesEqual(source, [entry()])).toBe(true);
    expect(areaItemPropertyListEntriesEqual(source, [entry({ costValue: 4 })])).toBe(false);
    expect(areaItemPropertyListSourceEntriesEqual(source, source.map((value) => ({ ...value })))).toBe(true);
    expect(areaItemPropertyListSourceEntriesEqual(source, [{ sourceIndex: 1, ...entry() }])).toBe(false);
  });
});
