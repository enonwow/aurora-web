import { describe, expect, it } from "vitest";
import {
  MAX_AREA_DOOR_LINKED_TO_CODE_UNITS,
  areaDoorTransitionStorageEqual,
  cloneAreaDoorTransitionStorage,
  isAreaDoorTransitionStorage,
} from "../../../../src/modules/shared/domain/areaDoorTransitionStorage";

describe("Area Door transition storage", () => {
  it("accepts only one complete exact native storage trio", () => {
    expect(isAreaDoorTransitionStorage({
      linkedTo: "DESTINATION_TAG",
      linkedToFlags: 255,
      loadScreenId: 65_535,
    })).toBe(true);
    expect(isAreaDoorTransitionStorage({
      linkedTo: "x".repeat(MAX_AREA_DOOR_LINKED_TO_CODE_UNITS),
      linkedToFlags: 0,
      loadScreenId: 0,
    })).toBe(true);
  });

  it.each([
    undefined,
    {},
    { linkedTo: "DEST", linkedToFlags: 1 },
    { linkedTo: "DEST", linkedToFlags: 1, loadScreenId: 0, extra: true },
    { linkedTo: "BAD\0DEST", linkedToFlags: 1, loadScreenId: 0 },
    { linkedTo: "x".repeat(MAX_AREA_DOOR_LINKED_TO_CODE_UNITS + 1), linkedToFlags: 1, loadScreenId: 0 },
    { linkedTo: "DEST", linkedToFlags: -1, loadScreenId: 0 },
    { linkedTo: "DEST", linkedToFlags: 256, loadScreenId: 0 },
    { linkedTo: "DEST", linkedToFlags: 1.5, loadScreenId: 0 },
    { linkedTo: "DEST", linkedToFlags: 1, loadScreenId: 65_536 },
  ])("rejects malformed or non-exact storage %#", (value) => {
    expect(isAreaDoorTransitionStorage(value)).toBe(false);
  });

  it("clones and compares storage without sharing mutable input", () => {
    const source = { linkedTo: "DEST", linkedToFlags: 2, loadScreenId: 7 };
    const cloned = cloneAreaDoorTransitionStorage(source);

    expect(cloned).toEqual(source);
    expect(cloned).not.toBe(source);
    expect(Object.isFrozen(cloned)).toBe(true);
    expect(areaDoorTransitionStorageEqual(source, cloned)).toBe(true);
    expect(areaDoorTransitionStorageEqual(source, { ...cloned, loadScreenId: 8 })).toBe(false);
  });
});
