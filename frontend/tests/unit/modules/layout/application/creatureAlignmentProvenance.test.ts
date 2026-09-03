import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureAlignment,
  materializeExistingCreatureAlignment,
  reduceExistingCreatureAlignment,
} from "../../../../../src/modules/layout/application/creatureAlignmentProvenance";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "creature" as const,
  sourceIndex: 0,
  sourceObjectId: "creature:0:nw_guard:source",
  creatureAlignment: {
    goodEvil: { present: true as const, nativeType: "byte" as const, value: 50 as const },
    lawfulChaotic: { present: true as const, nativeType: "byte" as const, value: 50 as const },
  },
};

describe("creatureAlignmentProvenance", () => {
  it("admits only an exact retained canonical Byte pair", () => {
    expect(canEditExistingCreatureAlignment(exactSource)).toBe(true);
    expect(canEditExistingCreatureAlignment({
      ...exactSource,
      creatureAlignment: {
        ...exactSource.creatureAlignment,
        lawfulChaotic: { present: false },
      },
    })).toBe(false);
    expect(canEditExistingCreatureAlignment({
      ...exactSource,
      sourceKind: "placeable",
    })).toBe(false);
  });

  it("reduces only canonical labels authorized by the retained pair", () => {
    expect(reduceExistingCreatureAlignment(exactSource, "True Neutral", "Lawful Good"))
      .toBe("Lawful Good");
    expect(reduceExistingCreatureAlignment(exactSource, "True Neutral", "Unknown"))
      .toBe("True Neutral");
    expect(reduceExistingCreatureAlignment({
      ...exactSource,
      creatureAlignment: {
        goodEvil: { present: false },
        lawfulChaotic: { present: false },
      },
    }, "True Neutral", "Lawful Good")).toBe("True Neutral");
  });

  it("materializes seed labels but preserves an unproven retained value", () => {
    expect(materializeExistingCreatureAlignment(undefined, "True Neutral", "Chaotic Good"))
      .toBe("Chaotic Good");
    expect(materializeExistingCreatureAlignment(exactSource, "True Neutral", "Lawful Evil"))
      .toBe("Lawful Evil");
    expect(materializeExistingCreatureAlignment({
      ...exactSource,
      creatureAlignment: {
        goodEvil: { present: false },
        lawfulChaotic: { present: false },
      },
    }, "True Neutral", "Lawful Evil")).toBe("True Neutral");
  });
});
