import { describe, expect, it } from "vitest";

import {
  readTriggerVariableProvenance,
  readTriggerVariableTargetEntries,
  triggerVariableEntriesEqual,
} from "../../../../../src/modules/scene/domain/triggerVariableTable";

describe("Trigger VarTable domain", () => {
  it("reads the exact ordered three-type profile and preserves duplicates", () => {
    const source = readTriggerVariableProvenance({ expectedEntries: [
      { sourceIndex: 0, name: "dup", type: "int", value: -2 },
      { sourceIndex: 1, name: "dup", type: "float", value: Math.fround(1.5) },
      { sourceIndex: 2, name: "", type: "string", value: "" },
    ] });
    const target = readTriggerVariableTargetEntries([
      { name: "dup", type: "int", value: -2 },
      { name: "dup", type: "float", value: Math.fround(1.5) },
      { name: "", type: "string", value: "" },
    ]);
    expect(source?.expectedEntries.map((entry) => entry.name)).toEqual(["dup", "dup", ""]);
    expect(target?.map((entry) => entry.type)).toEqual(["int", "float", "string"]);
    expect(source && target && triggerVariableEntriesEqual(source.expectedEntries, target))
      .toBe(true);
  });

  it("rejects noncontiguous provenance and non-binary32 targets", () => {
    expect(readTriggerVariableProvenance({ expectedEntries: [
      { sourceIndex: 1, name: "x", type: "int", value: 1 },
    ] })).toBeNull();
    expect(readTriggerVariableTargetEntries([
      { name: "x", type: "float", value: 0.1 },
    ])).toBeNull();
  });
});
