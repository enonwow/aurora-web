import { describe, expect, it } from "vitest";
import {
  placeableVariableEntriesEqual,
  readPlaceableVariableProvenance,
  readPlaceableVariableTargetEntries,
} from "../../../../../src/modules/scene/domain/placeableVariableTable";

describe("placeableVariableTable", () => {
  const expectedEntries = [
    { sourceIndex: 0, name: "Counter", type: "int" as const, value: -1 },
    { sourceIndex: 1, name: "Scale", type: "float" as const, value: 1.5 },
    { sourceIndex: 2, name: "", type: "string" as const, value: "" },
  ];

  it("reads all three exact Aurora types while preserving order and duplicates", () => {
    expect(readPlaceableVariableProvenance({ expectedEntries })).toEqual({ expectedEntries });
    const target = expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);
    expect(readPlaceableVariableTargetEntries(target)).toEqual(target);
    expect(placeableVariableEntriesEqual(expectedEntries, target)).toBe(true);
    expect(placeableVariableEntriesEqual(expectedEntries, [...target].reverse())).toBe(false);
  });

  it.each([
    { expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x", type: "float", value: 0.1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x\0", type: "string", value: "" }] },
    { expectedEntries: [], extra: true },
  ])("rejects malformed provenance %#", (value) => {
    expect(readPlaceableVariableProvenance(value)).toBeNull();
  });

  it("enforces target value and table budgets", () => {
    expect(readPlaceableVariableTargetEntries([
      { name: "x", type: "int", value: 2147483648 },
    ])).toBeNull();
    expect(readPlaceableVariableTargetEntries(
      Array.from({ length: 1025 }, () => ({ name: "", type: "int", value: 0 })),
    )).toBeNull();
  });
});
