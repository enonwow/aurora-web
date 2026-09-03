import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureChallengeRating,
  materializeExistingCreatureChallengeRating,
  reduceExistingCreatureChallengeRating,
} from "../../../../../src/modules/layout/application/creatureChallengeRatingProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureChallengeRating: {
    present: true,
    nativeType: "float",
    value: 11.5,
  },
};

describe("existing Creature ChallengeRating provenance", () => {
  it("activates only exact present native Creature provenance", () => {
    expect(canEditExistingCreatureChallengeRating(exactSource)).toBe(true);
    expect(canEditExistingCreatureChallengeRating({
      ...exactSource,
      creatureChallengeRating: { present: false },
    })).toBe(false);
    expect(canEditExistingCreatureChallengeRating({
      ...exactSource,
      sourceKind: "placeable",
    })).toBe(false);
    expect(canEditExistingCreatureChallengeRating({
      ...exactSource,
      sourceIndex: undefined,
    })).toBe(false);
  });

  it("reduces admitted editor decimals without damaging their presentation", () => {
    expect(reduceExistingCreatureChallengeRating(exactSource, 11.5, 0.1)).toBe(0.1);
    expect(reduceExistingCreatureChallengeRating(exactSource, 11.5, 1_000)).toBe(1_000);
  });

  it("materializes the request once to exact binary32 and otherwise preserves source", () => {
    expect(materializeExistingCreatureChallengeRating(exactSource, 11.5, 0.1))
      .toBe(Math.fround(0.1));
    expect(materializeExistingCreatureChallengeRating(exactSource, 11.5, -1)).toBe(11.5);
    expect(materializeExistingCreatureChallengeRating(exactSource, 11.5, -0)).toBe(11.5);
    expect(materializeExistingCreatureChallengeRating(
      { ...exactSource, creatureChallengeRating: { present: false } },
      11.5,
      1,
    )).toBe(11.5);
  });
});
