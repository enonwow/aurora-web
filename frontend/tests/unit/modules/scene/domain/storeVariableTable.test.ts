import { describe, expect, it } from "vitest";
import {
  readStoreVariableProvenance,
  readStoreVariableTargetEntries,
  storeVariableEntriesEqual,
  storeVariableTargetEntriesEqual,
} from "../../../../../src/modules/scene/domain/storeVariableTable";

describe("storeVariableTable", () => {
  const expectedEntries = [
    { sourceIndex: 0, name: "Counter", type: "int" as const, value: -1 },
    { sourceIndex: 1, name: "Scale", type: "float" as const, value: Math.fround(1.5) },
    { sourceIndex: 2, name: "", type: "string" as const, value: "" },
  ];

  it("reads the exact ordered retained Store VarTable without losing duplicates", () => {
    expect(readStoreVariableProvenance({ expectedEntries })).toEqual({ expectedEntries });
    const target = expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);
    expect(readStoreVariableTargetEntries(target)).toEqual(target);
    expect(storeVariableEntriesEqual(expectedEntries, target)).toBe(true);
    expect(storeVariableEntriesEqual(expectedEntries, [...target].reverse())).toBe(false);
    expect(storeVariableTargetEntriesEqual(target, target)).toBe(true);
  });

  it.each([
    { expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x", type: "float", value: 0.1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x\0", type: "string", value: "" }] },
    { expectedEntries: [], extra: true },
  ])("rejects malformed Store provenance %#", (value) => {
    expect(readStoreVariableProvenance(value)).toBeNull();
  });
});
