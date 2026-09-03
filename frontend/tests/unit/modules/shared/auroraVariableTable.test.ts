import { describe, expect, it } from "vitest";
import {
  auroraVariableEntriesEqual,
  auroraVariableTargetEntriesEqual,
  readAuroraVariableProvenance,
  readAuroraVariableSourceEntries,
  readAuroraVariableTargetEntries,
} from "../../../../src/modules/shared/domain/auroraVariableTable";

describe("auroraVariableTable", () => {
  const expectedEntries = [
    { sourceIndex: 0, name: "Counter", type: "int" as const, value: -1 },
    { sourceIndex: 1, name: "Scale", type: "float" as const, value: Math.fround(1.5) },
    { sourceIndex: 2, name: "", type: "string" as const, value: "" },
    { sourceIndex: 3, name: "Counter", type: "int" as const, value: -1 },
  ];

  it("reads the complete native profile without normalizing order or duplicates", () => {
    expect(readAuroraVariableProvenance({ expectedEntries })).toEqual({ expectedEntries });
    expect(readAuroraVariableSourceEntries(expectedEntries)).toEqual(expectedEntries);
    const target = expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);
    expect(readAuroraVariableTargetEntries(target)).toEqual(target);
    expect(auroraVariableEntriesEqual(expectedEntries, target)).toBe(true);
    expect(auroraVariableEntriesEqual(expectedEntries, [...target].reverse())).toBe(false);
    expect(auroraVariableTargetEntriesEqual(target, target)).toBe(true);
    expect(auroraVariableTargetEntriesEqual(target, [...target].reverse())).toBe(false);
    expect(auroraVariableTargetEntriesEqual(undefined, undefined)).toBe(true);
  });

  it.each([
    { expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x", type: "float", value: 0.1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x\0", type: "string", value: "" }] },
    { expectedEntries: [], extra: true },
  ])("rejects malformed provenance %#", (value) => {
    expect(readAuroraVariableProvenance(value)).toBeNull();
  });

  it("enforces typed-value, table-size, and aggregate-text budgets", () => {
    expect(readAuroraVariableTargetEntries([
      { name: "x", type: "int", value: 2147483648 },
    ])).toBeNull();
    expect(readAuroraVariableTargetEntries(
      Array.from({ length: 1025 }, () => ({ name: "", type: "int", value: 0 })),
    )).toBeNull();
    expect(readAuroraVariableTargetEntries(
      Array.from({ length: 256 }, (_, index) => ({
        name: `n${index}`,
        type: "string" as const,
        value: "v".repeat(4096),
      })),
    )).toBeNull();
  });
});
