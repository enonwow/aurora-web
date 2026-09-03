import { describe, expect, it } from "vitest";
import {
  encounterVariableEntriesEqual,
  encounterVariableTargetEntriesEqual,
  readEncounterVariableProvenance,
  readEncounterVariableTargetEntries,
} from "../../../../../src/modules/scene/domain/encounterVariableTable";

describe("encounterVariableTable", () => {
  const expectedEntries = [
    { sourceIndex: 0, name: "Counter", type: "int" as const, value: -1 },
    { sourceIndex: 1, name: "Scale", type: "float" as const, value: Math.fround(1.5) },
    { sourceIndex: 2, name: "", type: "string" as const, value: "" },
  ];

  it("reads the exact ordered retained Encounter VarTable without losing duplicates", () => {
    expect(readEncounterVariableProvenance({ expectedEntries })).toEqual({ expectedEntries });
    const target = expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);
    expect(readEncounterVariableTargetEntries(target)).toEqual(target);
    expect(encounterVariableEntriesEqual(expectedEntries, target)).toBe(true);
    expect(encounterVariableEntriesEqual(expectedEntries, [...target].reverse())).toBe(false);
    expect(encounterVariableTargetEntriesEqual(target, target)).toBe(true);
  });

  it.each([
    { expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x", type: "float", value: 0.1 }] },
    { expectedEntries: [{ sourceIndex: 0, name: "x\0", type: "string", value: "" }] },
    { expectedEntries: [], extra: true },
  ])("rejects malformed Encounter provenance %#", (value) => {
    expect(readEncounterVariableProvenance(value)).toBeNull();
  });
});
