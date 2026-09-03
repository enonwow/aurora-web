import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureInterruptable,
  creatureInterruptableToNoInterrupt,
  isCreatureInterruptableValue,
  readCreatureInterruptableStorage,
} from "../../../../../src/modules/scene/domain/creatureInterruptable";

describe("Creature Interruptable provenance", () => {
  it("retains exact absence and both native Byte values", () => {
    expect(readCreatureInterruptableStorage({ present: false })).toEqual({ present: false });
    expect(readCreatureInterruptableStorage({ present: true, value: 0 }))
      .toEqual({ present: true, value: 0 });
    expect(readCreatureInterruptableStorage({ present: true, value: 1 }))
      .toEqual({ present: true, value: 1 });
    expect(isCreatureInterruptableValue(0)).toBe(true);
    expect(isCreatureInterruptableValue(1)).toBe(true);
  });

  it.each([
    null,
    [],
    {},
    { present: false, value: 1 },
    { present: true },
    { present: true, value: 2 },
    { present: true, value: false },
    { present: true, value: 1, extra: true },
  ])("rejects malformed exact storage %#", (input) => {
    expect(readCreatureInterruptableStorage(input)).toBeNull();
  });

  it("projects the exact inverse Toolset checkbox polarity", () => {
    expect(creatureInterruptableToNoInterrupt(0)).toBe(true);
    expect(creatureInterruptableToNoInterrupt(1)).toBe(false);
    expect(creatureInterruptableToNoInterrupt(2)).toBeUndefined();
  });

  it("activates only exact present retained Creature provenance", () => {
    const exact = {
      type: "aurora_git" as const,
      sourceKind: "creature" as const,
      sourceIndex: 0,
      creatureInterruptable: { present: true as const, value: 1 as const },
    };
    expect(canEditExistingCreatureInterruptable(exact)).toBe(true);
    expect(canEditExistingCreatureInterruptable({
      ...exact,
      creatureInterruptable: { present: false },
    })).toBe(false);
    expect(canEditExistingCreatureInterruptable({ ...exact, sourceKind: "placeable" }))
      .toBe(false);
    expect(canEditExistingCreatureInterruptable({ ...exact, sourceIndex: undefined }))
      .toBe(false);
    expect(canEditExistingCreatureInterruptable(undefined)).toBe(false);
  });
});
