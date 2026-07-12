import { describe, expect, it } from "vitest";
import {
  AURORA_LIGHT_MANAGER_CURRENT_OBJECT_SCORE,
  AURORA_LIGHT_MANAGER_INVALID_SCORE,
  AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY,
  AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_PROOF_STATUS,
  AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_SOURCE,
  resolveAuroraLightManagerPreviewScore,
  selectAuroraLightManagerPreviewBudget
} from "../../../../src/modules/layout/adapters/three/auroraLightManagerPreview";

describe("auroraLightManagerPreview", () => {
  it("sorts source-backed active-light candidates by recovered score and slot cap", () => {
    const budget = selectAuroraLightManagerPreviewBudget(
      [
        {
          key: "far",
          sourceIndex: 0,
          payload: "far",
          scoreInput: {
            position: { x: 8, y: 0, z: 0 },
            sourceRadius: 10,
            multiplier: 1,
            priority: 1
          }
        },
        {
          key: "invalid",
          sourceIndex: 1,
          payload: "invalid",
          scoreInput: {
            position: { x: 0, y: 0, z: 0 },
            sourceRadius: 0,
            multiplier: 1,
            priority: 0
          }
        },
        {
          key: "near",
          sourceIndex: 2,
          payload: "near",
          scoreInput: {
            position: { x: 1, y: 0, z: 0 },
            sourceRadius: 10,
            multiplier: 1,
            priority: 0
          }
        },
        {
          key: "current-object",
          sourceIndex: 3,
          payload: "current-object",
          scoreInput: {
            position: { x: 99, y: 0, z: 0 },
            sourceRadius: 1,
            multiplier: 1,
            priority: 0,
            currentObjectLane: true
          }
        }
      ],
      2
    );

    expect(budget.map((entry) => entry.key)).toEqual([
      "current-object",
      "near",
      "far",
      "invalid"
    ]);
    expect(budget.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
    expect(budget.map((entry) => entry.accepted)).toEqual([
      true,
      true,
      false,
      false
    ]);
    expect(budget[0].retailScore.score).toBe(AURORA_LIGHT_MANAGER_CURRENT_OBJECT_SCORE);
    expect(budget[3].retailScore.score).toBe(AURORA_LIGHT_MANAGER_INVALID_SCORE);
    expect(budget[1].retailScore.source).toContain("FUN_00a41850");
    expect(AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY).toContain(
      "global-budget"
    );
    expect(AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_SOURCE).toContain(
      "FUN_00a41e30 caps uploaded active slots"
    );
    expect(AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_PROOF_STATUS).toBe(
      "source-backed-retail-score-sort-slot-cap-preview-camera-field-fallback"
    );
  });

  it("keeps the raw score formula source-backed and explicit", () => {
    const score = resolveAuroraLightManagerPreviewScore({
      position: { x: 3, y: 4, z: 0 },
      sourceRadius: 9,
      multiplier: 2,
      priority: 2,
      field0x70: 1,
      runtimeExtent: 1.5
    });

    expect(score.distance).toBe(5);
    expect(score.rangeTerm).toBe(27);
    expect(score.score).toBeCloseTo((3 * 5) / (5 * 28));
    expect(score.activeSelectionRadiusLimit).toBe(9);
    expect(score.activeSelectionRadiusEnforced).toBe(false);
    expect(score.activeSelectionRadiusPassed).toBe(true);
    expect(score.activeSelectionRadiusSource).toContain("FUN_00a42728");
    expect(score.sortDirection).toBe("ascending-score-field-0x84-preview");
    expect(score.fallback).toContain("cross-lane-callsite-blocked");
  });

  it("can enforce the recovered active-selection radius gate without consuming a slot", () => {
    const budget = selectAuroraLightManagerPreviewBudget(
      [
        {
          key: "outside-high-priority",
          sourceIndex: 0,
          payload: "outside-high-priority",
          scoreInput: {
            position: { x: 3, y: 0, z: 0 },
            sourceRadius: 2,
            multiplier: 1,
            priority: 0,
            enforceActiveSelectionRadius: true
          }
        },
        {
          key: "inside-lower-priority",
          sourceIndex: 1,
          payload: "inside-lower-priority",
          scoreInput: {
            position: { x: 1, y: 0, z: 0 },
            sourceRadius: 2,
            activeSelectionRadiusOverride: 4,
            multiplier: 1,
            priority: 5,
            enforceActiveSelectionRadius: true
          }
        }
      ],
      1
    );

    expect(budget.map((entry) => entry.key)).toEqual([
      "outside-high-priority",
      "inside-lower-priority"
    ]);
    expect(budget.map((entry) => entry.accepted)).toEqual([false, true]);
    expect(budget[0].retailScore.activeSelectionRadiusLimit).toBe(2);
    expect(budget[0].retailScore.activeSelectionRadiusPassed).toBe(false);
    expect(budget[1].retailScore.activeSelectionRadiusLimit).toBe(4);
    expect(budget[1].retailScore.activeSelectionRadiusPassed).toBe(true);
    expect(budget[0].retailScore.activeSelectionRadiusRule).toContain("light+0x60");
  });
});
