import {
  AuroraVariableTableValidationError,
  auroraVariableEntriesEqual,
  auroraVariableSourceEntriesEqual,
  parseAuroraVariableMutation,
  parseAuroraVariableProvenance,
  parseAuroraVariableSourceEntries,
  parseAuroraVariableTargetEntries,
} from "../../src/modules/areas/domain/aurora-variable-table";

describe("Aurora variable table domain", () => {
  const expectedEntries = [
    { sourceIndex: 0, name: "Count", type: "int" as const, value: -2 },
    { sourceIndex: 1, name: "Scale", type: "float" as const, value: Math.fround(1.5) },
    { sourceIndex: 2, name: "", type: "string" as const, value: "" },
    { sourceIndex: 3, name: "Count", type: "int" as const, value: -2 },
  ];

  it("admits all native types while retaining physical order and duplicates", () => {
    expect(parseAuroraVariableProvenance({ expectedEntries })).toEqual({ expectedEntries });
    expect(parseAuroraVariableSourceEntries(expectedEntries)).toEqual(expectedEntries);
    const target = expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);
    expect(parseAuroraVariableTargetEntries(target)).toEqual(target);
    expect(auroraVariableEntriesEqual(expectedEntries, target)).toBe(true);
    expect(auroraVariableEntriesEqual(expectedEntries, [...target].reverse())).toBe(false);
    expect(auroraVariableSourceEntriesEqual(expectedEntries, expectedEntries)).toBe(true);
    expect(auroraVariableSourceEntriesEqual(expectedEntries, [...expectedEntries].reverse()))
      .toBe(false);
  });

  it("admits only exact changed complete mutations", () => {
    const entries = expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);
    expect(parseAuroraVariableMutation({ expectedEntries, entries: [] })).toEqual({
      expectedEntries,
      entries: [],
    });
    expect(() => parseAuroraVariableMutation({ expectedEntries, entries }))
      .toThrow(/unchanged/u);
    expect(() => parseAuroraVariableMutation({ expectedEntries, entries: [], extra: true }))
      .toThrow(/invalid_mutation/u);
  });

  it.each([
    [{ expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 1 }] }],
    [{ expectedEntries: [{ sourceIndex: 0, name: "x", type: "int", value: 1, extra: true }] }],
    [{ expectedEntries: [{ sourceIndex: 0, name: "x\0", type: "int", value: 1 }] }],
    [{ expectedEntries: [{ sourceIndex: 0, name: "x", type: "int", value: 2147483648 }] }],
    [{ expectedEntries: [{ sourceIndex: 0, name: "x", type: "float", value: 0.1 }] }],
    [{ expectedEntries: [{ sourceIndex: 0, name: "x", type: "float", value: Number.NaN }] }],
    [{ expectedEntries: [{ sourceIndex: 0, name: "x", type: "string", value: "x\0" }] }],
  ])("rejects malformed provenance %p", (candidate) => {
    expect(() => parseAuroraVariableProvenance(candidate))
      .toThrow(AuroraVariableTableValidationError);
  });

  it("enforces per-field, entry-count, and aggregate text budgets", () => {
    expect(() => parseAuroraVariableTargetEntries(
      Array.from({ length: 1025 }, () => ({ name: "", type: "int", value: 0 })),
    )).toThrow(/1024/u);
    expect(() => parseAuroraVariableTargetEntries([{
      name: "n".repeat(65), type: "int", value: 0,
    }])).toThrow(/name/u);
    expect(() => parseAuroraVariableTargetEntries([{
      name: "x", type: "string", value: "v".repeat(4097),
    }])).toThrow(/invalid_typed_value/u);
    expect(() => parseAuroraVariableTargetEntries(
      Array.from({ length: 256 }, (_, index) => ({
        name: `n${index}`,
        type: "string" as const,
        value: "v".repeat(4096),
      })),
    )).toThrow(/text_budget_exceeded/u);
  });
});
