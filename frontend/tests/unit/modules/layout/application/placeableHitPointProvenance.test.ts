import { describe, expect, it } from "vitest";

import {
  canEditExistingPlaceableHitPoints,
  materializeExistingPlaceableHitPoints,
  readExistingPlaceableHitPointState,
  reduceExistingPlaceableHitPoints
} from "../../../../../src/modules/layout/application/placeableHitPointProvenance";
import {
  derivePlaceableCurrentHitPoints,
  isAuroraShort,
  isEditablePlaceableHitPoints,
  readPlaceableHitPointState
} from "../../../../../src/modules/scene/domain/placeableHitPoints";
import { buildPlaceablePropertiesDraft } from "../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { cloneSceneObject } from "../../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../../src/modules/scene/domain/sceneFactory";

const exactState = { hitPoints: 15, currentHitPoints: 45 };
const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "placeable" as const,
  placeableHitPointState: exactState
};

describe("existing Placeable HP / CurrentHP provenance", () => {
  it.each([
    [15, 45, 30, 90],
    [15, 14, 30, 14],
    [15, 29, 30, 30],
    [1, 16_384, 2, 1],
    [1, 32_767, 10_000, 1],
    [10_000, 32_767, 1, 3]
  ])("derives Aurora CurrentHP for %i/%i -> %i as %i", (
    expectedHitPoints,
    expectedCurrentHitPoints,
    hitPoints,
    expected
  ) => {
    expect(derivePlaceableCurrentHitPoints({
      expectedHitPoints,
      expectedCurrentHitPoints,
      hitPoints
    })).toBe(expected);
  });

  it("admits only one exact native source pair on an existing aurora_git Placeable", () => {
    expect(readPlaceableHitPointState(exactState)).toEqual(exactState);
    expect(readExistingPlaceableHitPointState(exactSource)).toEqual(exactState);
    expect(canEditExistingPlaceableHitPoints(exactSource)).toBe(true);
    expect(canEditExistingPlaceableHitPoints({ ...exactSource, type: "seed" })).toBe(false);
    expect(canEditExistingPlaceableHitPoints({ ...exactSource, sourceKind: "door" })).toBe(false);
  });

  it("admits exact numeric boundaries and rejects every invalid derivation member", () => {
    expect(isEditablePlaceableHitPoints(1)).toBe(true);
    expect(isEditablePlaceableHitPoints(10_000)).toBe(true);
    expect(isEditablePlaceableHitPoints(0)).toBe(false);
    expect(isEditablePlaceableHitPoints(10_001)).toBe(false);
    expect(isAuroraShort(-32_768)).toBe(true);
    expect(isAuroraShort(32_767)).toBe(true);
    expect(isAuroraShort(-32_769)).toBe(false);
    expect(isAuroraShort(32_768)).toBe(false);
    expect(derivePlaceableCurrentHitPoints({
      expectedHitPoints: 0,
      expectedCurrentHitPoints: 1,
      hitPoints: 1
    })).toBeNull();
    expect(derivePlaceableCurrentHitPoints({
      expectedHitPoints: 1,
      expectedCurrentHitPoints: 1,
      hitPoints: 0
    })).toBeNull();
    expect(derivePlaceableCurrentHitPoints({
      expectedHitPoints: 1,
      expectedCurrentHitPoints: 32_768,
      hitPoints: 1
    })).toBeNull();
  });

  it("rejects same-cardinality source records with inherited admitted values", () => {
    const inherited = Object.assign(Object.create(exactState), {
      hitPoints: 15,
      extra: true
    });
    expect(readPlaceableHitPointState(inherited)).toBeNull();
  });

  it.each([
    null,
    [],
    15,
    { hitPoints: 15 },
    { currentHitPoints: 45 },
    { hitPoints: 15, currentHitPoints: 45, extra: true },
    { hitPoints: 0, currentHitPoints: 45 },
    { hitPoints: 10_001, currentHitPoints: 45 },
    { hitPoints: 15.5, currentHitPoints: 45 },
    { hitPoints: 15, currentHitPoints: -32_769 },
    { hitPoints: 15, currentHitPoints: 32_768 },
    { hitPoints: 15, currentHitPoints: 45.5 }
  ])("rejects malformed source state %#", (candidate) => {
    expect(readPlaceableHitPointState(candidate)).toBeNull();
    expect(canEditExistingPlaceableHitPoints({
      ...exactSource,
      placeableHitPointState: candidate as never
    })).toBe(false);
  });

  it("reduces only integer Toolset-range targets under exact provenance", () => {
    expect(reduceExistingPlaceableHitPoints(exactSource, 15, 1)).toBe(1);
    expect(reduceExistingPlaceableHitPoints(exactSource, 15, 10_000)).toBe(10_000);
    for (const candidate of [0, 10_001, 1.5, "30", null, undefined]) {
      expect(reduceExistingPlaceableHitPoints(exactSource, 15, candidate)).toBe(15);
    }
    expect(reduceExistingPlaceableHitPoints({ ...exactSource, type: "seed" }, 15, 30)).toBe(15);
  });

  it("materializes only an existing source-backed target and otherwise preserves presence", () => {
    expect(materializeExistingPlaceableHitPoints(exactSource, 15, 30)).toBe(30);
    expect(materializeExistingPlaceableHitPoints(exactSource, undefined, 30)).toBeUndefined();
    expect(materializeExistingPlaceableHitPoints({ ...exactSource, type: "seed" }, 15, 30)).toBe(15);
    expect(materializeExistingPlaceableHitPoints(exactSource, 15, 0)).toBe(15);
  });

  it("builds the HP draft from the mapped target and deep-clones provenance for cancel/undo", () => {
    const object = createNewSceneObject("placeables", 1, 2, 3);
    object.source = {
      ...exactSource,
      placeableHitPointState: { hitPoints: 27, currentHitPoints: 54 }
    };
    object.placeableProperties = {
      plot: false,
      useable: false,
      hasInventory: false,
      hitPoints: 27
    };

    expect(buildPlaceablePropertiesDraft(object).hitPoints).toBe(27);
    const clone = cloneSceneObject(object);
    expect(clone.source?.placeableHitPointState).toEqual(object.source.placeableHitPointState);
    expect(clone.source?.placeableHitPointState).not.toBe(object.source.placeableHitPointState);
    expect(clone.placeableProperties).not.toBe(object.placeableProperties);

    const sourceOnly = cloneSceneObject(object);
    sourceOnly.placeableProperties = {
      plot: false,
      useable: false,
      hasInventory: false
    };
    expect(buildPlaceablePropertiesDraft(sourceOnly).hitPoints).toBe(27);
  });
});
