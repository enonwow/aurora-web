import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureInterruptable,
  materializeExistingCreatureNoInterrupt,
  reduceExistingCreatureNoInterrupt,
} from "../../../../../src/modules/layout/application/creatureInterruptableProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureInterruptable: { present: true, value: 1 },
};

describe("existing Creature Interruptable provenance", () => {
  it("activates only exact present native Creature provenance", () => {
    expect(canEditExistingCreatureInterruptable(exactSource)).toBe(true);
    expect(canEditExistingCreatureInterruptable({
      ...exactSource,
      creatureInterruptable: { present: false },
    })).toBe(false);
    expect(canEditExistingCreatureInterruptable({
      ...exactSource,
      sourceKind: "placeable",
    })).toBe(false);
  });

  it("reduces only booleans for an admitted source", () => {
    expect(reduceExistingCreatureNoInterrupt(exactSource, false, true)).toBe(true);
    expect(reduceExistingCreatureNoInterrupt(exactSource, true, false)).toBe(false);
    expect(reduceExistingCreatureNoInterrupt(exactSource, false, 1)).toBe(false);
    expect(reduceExistingCreatureNoInterrupt(
      { ...exactSource, creatureInterruptable: { present: false } },
      false,
      true,
    )).toBe(false);
  });

  it("materializes a provenance-bound checkbox value without touching source", () => {
    expect(materializeExistingCreatureNoInterrupt(exactSource, false, true)).toBe(true);
    expect(materializeExistingCreatureNoInterrupt(exactSource, true, false)).toBe(false);
    expect(exactSource.creatureInterruptable).toEqual({ present: true, value: 1 });
  });
});
