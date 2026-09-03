import { describe, expect, it } from "vitest";
import {
  materializeExistingCreatureAdvancedFlag,
  reduceExistingCreatureAdvancedFlag,
} from "../../../../../src/modules/layout/application/creatureAdvancedFlagsProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureAdvancedFlags: {
    disarmable: { present: true, value: 1 },
    plot: { present: true, value: 0 },
    immortal: { present: false },
    lootable: { present: true, value: 0 },
    noPermanentDeath: { present: true, value: 1 },
  },
};

describe("existing Creature advanced flag provenance", () => {
  it("reduces only booleans for the admitted exact member", () => {
    expect(reduceExistingCreatureAdvancedFlag(exactSource, "plot", false, true)).toBe(true);
    expect(reduceExistingCreatureAdvancedFlag(exactSource, "plot", true, false)).toBe(false);
    expect(reduceExistingCreatureAdvancedFlag(exactSource, "plot", false, 1)).toBe(false);
    expect(reduceExistingCreatureAdvancedFlag(exactSource, "immortal", false, true)).toBe(false);
  });

  it("materializes a provenance-bound direct-polarity checkbox without touching source", () => {
    expect(materializeExistingCreatureAdvancedFlag(exactSource, "lootable", false, true))
      .toBe(true);
    expect(materializeExistingCreatureAdvancedFlag(exactSource, "noPermanentDeath", true, false))
      .toBe(false);
    expect(exactSource.creatureAdvancedFlags?.lootable).toEqual({ present: true, value: 0 });
  });
});
