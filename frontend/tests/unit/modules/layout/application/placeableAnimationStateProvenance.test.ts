import { describe, expect, it } from "vitest";

import {
  canEditExistingPlaceableAnimationState,
  materializeExistingPlaceableAnimationState,
  reduceExistingPlaceableInitialState
} from "../../../../../src/modules/layout/application/placeableAnimationStateProvenance";

describe("existing Placeable AnimationState provenance", () => {
  const source = {
    type: "aurora_git" as const,
    sourceKind: "placeable" as const,
    placeableAnimationState: 0
  };

  it("admits only exact existing GIT Placeable provenance", () => {
    expect(canEditExistingPlaceableAnimationState(source)).toBe(true);
    expect(canEditExistingPlaceableAnimationState({
      type: "aurora_git",
      sourceKind: "placeable"
    })).toBe(false);
    expect(canEditExistingPlaceableAnimationState({ ...source, placeableAnimationState: 3 }))
      .toBe(false);
    expect(canEditExistingPlaceableAnimationState({ ...source, type: "seed" })).toBe(false);
    expect(canEditExistingPlaceableAnimationState({ ...source, sourceKind: "door" })).toBe(false);
  });

  it("reduces only frozen target tokens with exact provenance", () => {
    expect(reduceExistingPlaceableInitialState(source, "Closed", "Opened 2"))
      .toBe("Opened 2");
    expect(reduceExistingPlaceableInitialState(source, "Closed", "Default")).toBe("Closed");
    expect(reduceExistingPlaceableInitialState({
      type: "aurora_git",
      sourceKind: "placeable"
    }, "Closed", "Opened 1")).toBe("Closed");
  });

  it("materializes only Initial State and preserves every unrelated Advanced member", () => {
    const current = {
      blueprintResRef: "plc_watertrough",
      belongsToFaction: "Hostile",
      conversation: "old_conv",
      noInterrupt: true,
      portraitResRef: "po_old",
      initialState: "Closed",
      treasureModel: "Default"
    };
    const result = materializeExistingPlaceableAnimationState(source, current, {
      ...current,
      blueprintResRef: "must_not_apply",
      portraitResRef: "must_not_apply",
      initialState: "Opened 1",
      treasureModel: "Gold"
    });
    expect(result).toEqual({ ...current, initialState: "Opened 1" });

    expect(materializeExistingPlaceableAnimationState({
      ...source,
      placeableAnimationState: 3
    }, current, { ...current, initialState: "Opened 2" })).toEqual(current);
    expect(materializeExistingPlaceableAnimationState(source, undefined, {
      initialState: "Opened 2"
    })).toBeUndefined();
  });
});
