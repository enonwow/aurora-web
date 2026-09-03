import {
  AreaItemVariableTableValidationError,
  areaItemVariableEntriesEqual,
  parseAreaItemVariableMutation,
  parseAreaItemVariableProvenance,
  parseAreaItemVariableTargetEntries,
} from "../../src/modules/areas/domain/area-item-variable-table";

describe("Area ground-Item variable table domain", () => {
  const expectedEntries = [
    { sourceIndex: 0, name: "Counter", type: "int" as const, value: -2 },
    { sourceIndex: 1, name: "Scale", type: "float" as const, value: Math.fround(1.5) },
    { sourceIndex: 2, name: "", type: "string" as const, value: "" },
  ];

  it("admits the exact ordered native three-type profile", () => {
    expect(parseAreaItemVariableProvenance({ expectedEntries })).toEqual({ expectedEntries });
    const target = expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);
    expect(parseAreaItemVariableTargetEntries(target)).toEqual(target);
    expect(areaItemVariableEntriesEqual(expectedEntries, target)).toBe(true);
    expect(areaItemVariableEntriesEqual(expectedEntries, [...target].reverse())).toBe(false);
  });

  it("admits only one complete changed CAS pair", () => {
    const entries = expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);
    expect(parseAreaItemVariableMutation({
      expectedEntries,
      entries: [...entries].reverse(),
    })).toEqual({ expectedEntries, entries: [...entries].reverse() });
    expect(() => parseAreaItemVariableMutation({ expectedEntries, entries }))
      .toThrow(/unchanged/u);
  });

  it.each([
    { expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x\0", type: "int", value: 1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x", type: "float", value: 0.1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x", type: "string", value: "x\0" }] },
    { expectedEntries: [], extra: true },
  ])("rejects malformed provenance %#", (value) => {
    expect(() => parseAreaItemVariableProvenance(value))
      .toThrow(AreaItemVariableTableValidationError);
  });
});
