import {
  AreaEncounterVariableTableValidationError,
  areaEncounterVariableEntriesEqual,
  parseAreaEncounterVariableMutation,
  parseAreaEncounterVariableProvenance,
  parseAreaEncounterVariableTargetEntries,
} from "../../src/modules/areas/domain/area-encounter-variable-table";

describe("Area Encounter variable table domain", () => {
  const expectedEntries = [
    { sourceIndex: 0, name: "Counter", type: "int" as const, value: -2 },
    { sourceIndex: 1, name: "Scale", type: "float" as const, value: Math.fround(1.5) },
    { sourceIndex: 2, name: "", type: "string" as const, value: "" },
  ];

  it("admits the exact ordered native three-type profile", () => {
    expect(parseAreaEncounterVariableProvenance({ expectedEntries })).toEqual({ expectedEntries });
    const target = expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);
    expect(parseAreaEncounterVariableTargetEntries(target)).toEqual(target);
    expect(areaEncounterVariableEntriesEqual(expectedEntries, target)).toBe(true);
    expect(areaEncounterVariableEntriesEqual(expectedEntries, [...target].reverse())).toBe(false);
  });

  it("admits only one complete changed CAS pair", () => {
    const entries = expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);
    expect(parseAreaEncounterVariableMutation({
      expectedEntries,
      entries: [...entries].reverse(),
    })).toEqual({ expectedEntries, entries: [...entries].reverse() });
    expect(() => parseAreaEncounterVariableMutation({ expectedEntries, entries }))
      .toThrow(/unchanged/u);
  });

  it.each([
    { expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x\0", type: "int", value: 1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x", type: "float", value: 0.1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x", type: "string", value: "x\0" }] },
    { expectedEntries: [], extra: true },
  ])("rejects malformed provenance %#", (value) => {
    expect(() => parseAreaEncounterVariableProvenance(value))
      .toThrow(AreaEncounterVariableTableValidationError);
  });
});
