import { describe, expect, it } from "vitest";
import type { SceneObjectSourceMetadata } from
  "../../../../../src/modules/scene/contracts";
import {
  appendExistingCreatureVariable,
  canEditExistingCreatureVariables,
  moveExistingCreatureVariable,
  removeExistingCreatureVariable,
  updateExistingCreatureVariable,
} from
  "../../../../../src/modules/layout/application/creatureVariableProvenance";

describe("creatureVariableProvenance", () => {
  const source: SceneObjectSourceMetadata = {
    type: "aurora_git",
    sourceKind: "creature",
    creatureVariables: { expectedEntries: [
      { sourceIndex: 0, name: "a", type: "int", value: 1 },
      { sourceIndex: 1, name: "b", type: "string", value: "two" },
    ] },
  };
  const current = [
    { name: "a", type: "int" as const, value: 1 },
    { name: "b", type: "string" as const, value: "two" },
  ];

  it("admits only exact existing Aurora GIT Creature provenance", () => {
    expect(canEditExistingCreatureVariables(source)).toBe(true);
    expect(canEditExistingCreatureVariables({ ...source, sourceKind: "placeable" })).toBe(false);
    expect(canEditExistingCreatureVariables({ ...source, creatureVariables: {
      expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 0 }],
    } })).toBe(false);
  });

  it("supports add, edit, remove, and physical reorder without mutating the source list", () => {
    const added = appendExistingCreatureVariable(source, current);
    expect(added).toHaveLength(3);
    expect(current).toHaveLength(2);
    expect(updateExistingCreatureVariable(source, current, 0, {
      name: "a", type: "int", value: -3,
    })[0]).toEqual({ name: "a", type: "int", value: -3 });
    expect(removeExistingCreatureVariable(source, current, 0)).toEqual([current[1]]);
    expect(moveExistingCreatureVariable(source, current, 0, "down"))
      .toEqual([current[1], current[0]]);
  });

  it("keeps a retained Creature preserve-only when exact provenance is unavailable", () => {
    const preserveOnly = { type: "aurora_git", sourceKind: "creature" } as const;
    expect(appendExistingCreatureVariable(preserveOnly, current)).toBe(current);
    expect(updateExistingCreatureVariable(preserveOnly, current, 0, {
      name: "x", type: "int", value: 2,
    })).toBe(current);
    expect(removeExistingCreatureVariable(preserveOnly, current, 0)).toBe(current);
    expect(moveExistingCreatureVariable(preserveOnly, current, 0, "down")).toBe(current);
  });
});
