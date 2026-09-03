import { describe, expect, it } from "vitest";
import type { SceneObjectSourceMetadata } from
  "../../../../../src/modules/scene/contracts";
import {
  appendExistingEncounterVariable,
  canEditExistingEncounterVariables,
  moveExistingEncounterVariable,
  removeExistingEncounterVariable,
  updateExistingEncounterVariable,
} from
  "../../../../../src/modules/layout/application/encounterVariableProvenance";

describe("encounterVariableProvenance", () => {
  const source: SceneObjectSourceMetadata = {
    type: "aurora_git",
    sourceKind: "encounter",
    encounterVariables: { expectedEntries: [
      { sourceIndex: 0, name: "a", type: "int", value: 1 },
      { sourceIndex: 1, name: "b", type: "string", value: "two" },
    ] },
  };
  const current = [
    { name: "a", type: "int" as const, value: 1 },
    { name: "b", type: "string" as const, value: "two" },
  ];

  it("admits only exact existing Aurora GIT Encounter provenance", () => {
    expect(canEditExistingEncounterVariables(source)).toBe(true);
    expect(canEditExistingEncounterVariables({ ...source, sourceKind: "placeable" })).toBe(false);
    expect(canEditExistingEncounterVariables({ ...source, encounterVariables: {
      expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 0 }],
    } })).toBe(false);
  });

  it("supports add, edit, remove, and physical reorder without mutating the source list", () => {
    expect(appendExistingEncounterVariable(source, current)).toHaveLength(3);
    expect(current).toHaveLength(2);
    expect(updateExistingEncounterVariable(source, current, 0, {
      name: "a", type: "int", value: -3,
    })[0]).toEqual({ name: "a", type: "int", value: -3 });
    expect(removeExistingEncounterVariable(source, current, 0)).toEqual([current[1]]);
    expect(moveExistingEncounterVariable(source, current, 0, "down"))
      .toEqual([current[1], current[0]]);
  });

  it("keeps the target preserve-only when exact provenance is unavailable", () => {
    const preserveOnly = { type: "aurora_git", sourceKind: "encounter" } as const;
    expect(appendExistingEncounterVariable(preserveOnly, current)).toBe(current);
    expect(updateExistingEncounterVariable(preserveOnly, current, 0, current[1])).toBe(current);
    expect(removeExistingEncounterVariable(preserveOnly, current, 0)).toBe(current);
    expect(moveExistingEncounterVariable(preserveOnly, current, 0, "down")).toBe(current);
  });
});
