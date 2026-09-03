import { describe, expect, it } from "vitest";

import {
  canEditExistingPlaceableDurabilitySaveByte,
  materializeExistingPlaceableDurabilitySaveBytes,
  reduceExistingPlaceableDurabilitySaveByte
} from "../../../../../src/modules/layout/application/placeableDurabilitySaveProvenance";

describe("existing Placeable durability/save Byte provenance", () => {
  const source = {
    type: "aurora_git" as const,
    sourceKind: "placeable" as const,
    placeableDurabilitySaveBytes: {
      hardness: 0,
      fortitudeSave: 255,
      reflexSave: 4,
      willSave: 12
    }
  };

  it.each([
    "hardness",
    "fortitudeSave",
    "reflexSave",
    "willSave"
  ] as const)("admits exact %s provenance", (field) => {
    expect(canEditExistingPlaceableDurabilitySaveByte(source, field)).toBe(true);
  });

  it("rejects absent, invalid, non-GIT, and non-Placeable provenance", () => {
    expect(canEditExistingPlaceableDurabilitySaveByte({
      type: "aurora_git",
      sourceKind: "placeable",
      placeableDurabilitySaveBytes: { hardness: 256 }
    }, "hardness")).toBe(false);
    expect(canEditExistingPlaceableDurabilitySaveByte({
      type: "aurora_git",
      sourceKind: "placeable",
      placeableDurabilitySaveBytes: {}
    }, "hardness")).toBe(false);
    expect(canEditExistingPlaceableDurabilitySaveByte({ ...source, type: "seed" }, "hardness"))
      .toBe(false);
    expect(canEditExistingPlaceableDurabilitySaveByte({
      ...source,
      sourceKind: "creature"
    }, "hardness")).toBe(false);
  });

  it("reduces only exact proven fields with valid integer Byte targets", () => {
    expect(reduceExistingPlaceableDurabilitySaveByte(source, "hardness", 5, 255)).toBe(255);
    expect(reduceExistingPlaceableDurabilitySaveByte(source, "hardness", 5, -1)).toBe(5);
    expect(reduceExistingPlaceableDurabilitySaveByte(source, "hardness", 5, 1.5)).toBe(5);
    expect(reduceExistingPlaceableDurabilitySaveByte({
      ...source,
      placeableDurabilitySaveBytes: { fortitudeSave: 16 }
    }, "hardness", 5, 20)).toBe(5);
  });

  it("materializes proven draft values while preserving every unproven target", () => {
    expect(materializeExistingPlaceableDurabilitySaveBytes({
      ...source,
      placeableDurabilitySaveBytes: { hardness: 5, willSave: 0 }
    }, {
      hardness: 5,
      fortitudeSave: 16,
      reflexSave: 7,
      willSave: 0
    }, {
      hardness: 9,
      fortitudeSave: 33,
      reflexSave: 44,
      willSave: 11
    })).toEqual({
      hardness: 9,
      fortitudeSave: 16,
      reflexSave: 7,
      willSave: 11
    });
  });
});
