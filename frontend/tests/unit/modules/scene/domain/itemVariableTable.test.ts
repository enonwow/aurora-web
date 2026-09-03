import { describe, expect, it } from "vitest";
import {
  itemVariableEntriesEqual,
  readItemVariableProvenance,
  readItemVariableTargetEntries,
} from "../../../../../src/modules/scene/domain/itemVariableTable";

describe("itemVariableTable", () => {
  const expectedEntries = [
    { sourceIndex: 0, name: "Counter", type: "int" as const, value: -1 },
    { sourceIndex: 1, name: "Scale", type: "float" as const, value: 1.5 },
    { sourceIndex: 2, name: "", type: "string" as const, value: "" },
  ];

  it("reads all exact native types while preserving order and duplicates", () => {
    expect(readItemVariableProvenance({ expectedEntries })).toEqual({ expectedEntries });
    const target = expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);
    expect(readItemVariableTargetEntries(target)).toEqual(target);
    expect(itemVariableEntriesEqual(expectedEntries, target)).toBe(true);
    expect(itemVariableEntriesEqual(expectedEntries, [...target].reverse())).toBe(false);
  });

  it.each([
    { expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x", type: "float", value: 0.1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x\0", type: "string", value: "" }] },
    { expectedEntries: [], extra: true },
  ])("rejects malformed provenance %#", (value) => {
    expect(readItemVariableProvenance(value)).toBeNull();
  });
});
