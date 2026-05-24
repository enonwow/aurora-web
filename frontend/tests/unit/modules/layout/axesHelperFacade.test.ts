import { describe, expect, it } from "vitest";
import {
  BASE_AXES_HELPER_SIZE,
  resolveAxesHelperTransform
} from "../../../../src/modules/layout/axesHelperFacade";

describe("axesHelperFacade", () => {
  it("keeps axes helper centered in scene for stable viewport orientation cue", () => {
    const transform = resolveAxesHelperTransform(2, 2, 1);
    expect(transform.positionX).toBe(1);
    expect(transform.positionY).toBeCloseTo(0.02, 6);
    expect(transform.positionZ).toBe(1);
  });

  it("clamps helper scale to configured size band", () => {
    const tiny = resolveAxesHelperTransform(2, 2, 0.001);
    const huge = resolveAxesHelperTransform(2, 2, 100);
    expect(tiny.scale).toBeGreaterThan(0);
    expect(huge.scale).toBeCloseTo(1);
    expect(tiny.scale).toBeLessThanOrEqual(1);
    expect(huge.scale).toBeLessThanOrEqual(1);
    expect(BASE_AXES_HELPER_SIZE).toBeGreaterThan(1);
  });
});
