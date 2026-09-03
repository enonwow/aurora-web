import { describe, expect, it } from "vitest";
import {
  CREATURE_ADVANCED_FLAG_FIELDS,
  canEditExistingCreatureAdvancedFlag,
  creatureAdvancedFlagToBoolean,
  readCreatureAdvancedFlagsStorage,
} from "../../../../../src/modules/scene/domain/creatureAdvancedFlags";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "creature" as const,
  sourceIndex: 0,
  creatureAdvancedFlags: {
    disarmable: { present: true as const, value: 1 as const },
    plot: { present: false as const },
    immortal: { present: true as const, value: 0 as const },
    lootable: { present: true as const, value: 1 as const },
    noPermanentDeath: { present: true as const, value: 0 as const },
  },
};

describe("Creature advanced flag provenance", () => {
  it("retains the canonical field order and exact aggregate storage", () => {
    expect(CREATURE_ADVANCED_FLAG_FIELDS).toEqual([
      "disarmable",
      "plot",
      "immortal",
      "lootable",
      "noPermanentDeath",
    ]);
    const storage = readCreatureAdvancedFlagsStorage(exactSource.creatureAdvancedFlags);
    expect(storage).toEqual(exactSource.creatureAdvancedFlags);
    expect(Object.isFrozen(storage)).toBe(true);
    expect(Object.values(storage ?? {}).every(Object.isFrozen)).toBe(true);
  });

  it.each([
    null,
    [],
    {},
    {
      ...exactSource.creatureAdvancedFlags,
      plot: { present: true, value: 2 },
    },
    {
      ...exactSource.creatureAdvancedFlags,
      extra: { present: false },
    },
  ])("rejects malformed exact aggregate storage %#", (input) => {
    expect(readCreatureAdvancedFlagsStorage(input)).toBeNull();
  });

  it("maps direct native Byte polarity", () => {
    expect(creatureAdvancedFlagToBoolean(0)).toBe(false);
    expect(creatureAdvancedFlagToBoolean(1)).toBe(true);
    expect(creatureAdvancedFlagToBoolean(2)).toBeUndefined();
  });

  it("activates each field independently only for exact retained Creature provenance", () => {
    expect(canEditExistingCreatureAdvancedFlag(exactSource, "disarmable")).toBe(true);
    expect(canEditExistingCreatureAdvancedFlag(exactSource, "plot")).toBe(false);
    expect(canEditExistingCreatureAdvancedFlag(exactSource, "immortal")).toBe(true);
    expect(canEditExistingCreatureAdvancedFlag({ ...exactSource, sourceKind: "placeable" }, "lootable"))
      .toBe(false);
    expect(canEditExistingCreatureAdvancedFlag({ ...exactSource, sourceIndex: undefined }, "lootable"))
      .toBe(false);
    expect(canEditExistingCreatureAdvancedFlag(undefined, "lootable")).toBe(false);
  });
});
