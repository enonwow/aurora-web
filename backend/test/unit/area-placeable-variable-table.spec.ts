import {
  AreaPlaceableVariableTableValidationError,
  areaPlaceableVariableEntriesEqual,
  parseAreaPlaceableVariableProvenance,
  parseAreaPlaceableVariableMutation,
  parseAreaPlaceableVariableTargetEntries,
} from "../../src/modules/areas/domain/area-placeable-variable-table";

describe("Area Placeable variable table domain", () => {
  const expectedEntries = [
    { sourceIndex: 0, name: "Count", type: "int" as const, value: -2 },
    { sourceIndex: 1, name: "Scale", type: "float" as const, value: Math.fround(1.5) },
    { sourceIndex: 2, name: "", type: "string" as const, value: "" },
  ];

  it("admits exact ordered provenance and all three Aurora value types", () => {
    expect(parseAreaPlaceableVariableProvenance({ expectedEntries })).toEqual({ expectedEntries });
    expect(parseAreaPlaceableVariableTargetEntries(expectedEntries.map(({ sourceIndex: _, ...entry }) => entry)))
      .toEqual(expectedEntries.map(({ sourceIndex: _, ...entry }) => entry));
  });

  it("preserves order and duplicates when comparing complete tables", () => {
    const target = expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);
    expect(areaPlaceableVariableEntriesEqual(expectedEntries, target)).toBe(true);
    expect(areaPlaceableVariableEntriesEqual(expectedEntries, [...target].reverse())).toBe(false);
    expect(parseAreaPlaceableVariableTargetEntries([...target, { ...target[0]! }])).toHaveLength(4);
  });

  it("admits only a complete changed expected/target mutation pair", () => {
    const entries = expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);
    expect(parseAreaPlaceableVariableMutation({
      expectedEntries,
      entries: [...entries].reverse(),
    })).toEqual({ expectedEntries, entries: [...entries].reverse() });
    expect(() => parseAreaPlaceableVariableMutation({ expectedEntries, entries }))
      .toThrow(/unchanged/u);
    expect(() => parseAreaPlaceableVariableMutation({ expectedEntries, entries: [], extra: true }))
      .toThrow(/invalid_mutation/u);
  });

  it.each([
    [{ expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 1 }] }],
    [{ expectedEntries: [{ sourceIndex: 0, name: "x", type: "int", value: 1, extra: true }] }],
    [{ expectedEntries: [{ sourceIndex: 0, name: "x\0", type: "int", value: 1 }] }],
    [{ expectedEntries: [{ sourceIndex: 0, name: "x", type: "int", value: 2147483648 }] }],
    [{ expectedEntries: [{ sourceIndex: 0, name: "x", type: "float", value: 0.1 }] }],
    [{ expectedEntries: [{ sourceIndex: 0, name: "x", type: "string", value: "x\0" }] }],
  ])("rejects malformed provenance %p", (candidate) => {
    expect(() => parseAreaPlaceableVariableProvenance(candidate))
      .toThrow(AreaPlaceableVariableTableValidationError);
  });

  it("enforces entry and aggregate budgets", () => {
    expect(() => parseAreaPlaceableVariableTargetEntries(
      Array.from({ length: 1025 }, () => ({ name: "", type: "int", value: 0 })),
    )).toThrow(/1024/u);
    expect(() => parseAreaPlaceableVariableTargetEntries([{
      name: "n".repeat(65), type: "int", value: 0,
    }])).toThrow(/name/u);
    expect(() => parseAreaPlaceableVariableTargetEntries([{
      name: "x", type: "string", value: "v".repeat(4097),
    }])).toThrow(/invalid_typed_value/u);
  });
});
