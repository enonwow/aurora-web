import { describe, expect, it } from "vitest";

import {
  PLACEABLE_ANIMATION_STATE_TOKENS,
  isPlaceableAnimationState,
  isPlaceableAnimationStateToken,
  projectPlaceableAnimationState,
  projectPlaceableAnimationStateToken,
  readPlaceableAnimationState
} from "../../../../../src/modules/scene/domain/placeableAnimationState";

describe("Placeable AnimationState domain", () => {
  it("freezes the exact Toolset token order and native mapping", () => {
    expect(PLACEABLE_ANIMATION_STATE_TOKENS).toEqual(["Closed", "Opened 1", "Opened 2"]);
    expect(projectPlaceableAnimationStateToken(0)).toBe("Closed");
    expect(projectPlaceableAnimationStateToken(1)).toBe("Opened 1");
    expect(projectPlaceableAnimationStateToken(2)).toBe("Opened 2");
    expect(projectPlaceableAnimationState("Closed")).toBe(0);
    expect(projectPlaceableAnimationState("Opened 1")).toBe(1);
    expect(projectPlaceableAnimationState("Opened 2")).toBe(2);
  });

  it("accepts only exact numeric native values 0, 1, and 2", () => {
    for (const value of [0, 1, 2]) {
      expect(isPlaceableAnimationState(value)).toBe(true);
      expect(readPlaceableAnimationState({ animationState: value })).toBe(value);
    }
    for (const value of [-1, 3, 0.5, "0", false, undefined]) {
      expect(isPlaceableAnimationState(value)).toBe(false);
      expect(readPlaceableAnimationState({ animationState: value })).toBeUndefined();
    }
    expect(readPlaceableAnimationState(undefined)).toBeUndefined();
  });

  it("accepts no UI token outside the frozen set", () => {
    for (const value of PLACEABLE_ANIMATION_STATE_TOKENS) {
      expect(isPlaceableAnimationStateToken(value)).toBe(true);
    }
    for (const value of ["Default", "Open", "Opened", "Destroyed", 0, undefined]) {
      expect(isPlaceableAnimationStateToken(value)).toBe(false);
    }
  });
});
