import { describe, expect, it } from "vitest";
import {
  canEditExistingDoorTransitionStorage,
  cloneDoorTransitionPreserveOnlyPayload,
  materializeExistingDoorTransitionStorage,
  materializeExistingDoorTransitionPayload,
  readExistingDoorTransitionStorageProvenance,
} from "../../../../../src/modules/layout/application/doorTransitionStorageProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

describe("existing Door transition storage provenance", () => {
  it("admits one exact GIT Door ordinal and materializes the complete target without trimming", () => {
    const source = exactSource();

    expect(canEditExistingDoorTransitionStorage(source)).toBe(true);
    expect(readExistingDoorTransitionStorageProvenance(source)).toEqual({
      linkedTo: " SOURCE ", linkedToFlags: 1, loadScreenId: 0,
    });
    expect(materializeExistingDoorTransitionStorage(source, {
      linkedTo: " TARGET ", linkedToFlags: 2, loadScreenId: 7,
    })).toEqual({ linkedTo: " TARGET ", linkedToFlags: 2, loadScreenId: 7 });
  });

  it.each([
    ["missing ordinal", (source: SceneObjectSourceMetadata) => { delete source.sourceIndex; }],
    ["wrong family", (source: SceneObjectSourceMetadata) => { source.sourceKind = "creature"; }],
    ["wrong source", (source: SceneObjectSourceMetadata) => { source.type = "seed"; }],
    ["malformed trio", (source: SceneObjectSourceMetadata) => {
      source.doorTransitionStorage = { linkedTo: "SOURCE", linkedToFlags: 1 } as never;
    }],
  ])("fails closed for %s", (_label, mutate) => {
    const source = exactSource();
    mutate(source);

    expect(canEditExistingDoorTransitionStorage(source)).toBe(false);
    expect(readExistingDoorTransitionStorageProvenance(source)).toBeUndefined();
    expect(materializeExistingDoorTransitionStorage(source, {
      linkedTo: "TARGET", linkedToFlags: 2, loadScreenId: 7,
    })).toBeNull();
  });

  it("rejects a malformed target even when provenance is exact", () => {
    expect(materializeExistingDoorTransitionStorage(exactSource(), {
      linkedTo: "TARGET", linkedToFlags: 256, loadScreenId: 7,
    })).toBeNull();
  });

  it("replaces only exact storage while cloning preserve-only neighboring fields", () => {
    const flags = { legacy: true };
    const extra = { transitionDestination: "LEGACY" };
    const result = materializeExistingDoorTransitionPayload(
      exactSource(),
      {
        linkedTarget: " legacy target ",
        linkedModule: " legacy module ",
        linkedTag: " legacy tag ",
        linkedWaypoint: " legacy waypoint ",
        loadScreen: " legacy screen ",
        flags,
        extra,
        storage: { linkedTo: " SOURCE ", linkedToFlags: 1, loadScreenId: 0 },
      },
      { linkedTo: " TARGET ", linkedToFlags: 2, loadScreenId: 7 },
    );

    expect(result).toEqual({
      linkedTarget: " legacy target ",
      linkedModule: " legacy module ",
      linkedTag: " legacy tag ",
      linkedWaypoint: " legacy waypoint ",
      loadScreen: " legacy screen ",
      flags,
      extra,
      storage: { linkedTo: " TARGET ", linkedToFlags: 2, loadScreenId: 7 },
    });
    expect(result?.flags).not.toBe(flags);
    expect(result?.extra).not.toBe(extra);
  });

  it("omits existing-instance storage when cloning a transition payload for a new Door", () => {
    const result = cloneDoorTransitionPreserveOnlyPayload({
      linkedTarget: "legacy",
      linkedModule: "module",
      linkedTag: "tag",
      linkedWaypoint: "waypoint",
      loadScreen: "screen",
      flags: { legacy: true },
      extra: { transitionDestination: "LEGACY" },
      storage: { linkedTo: "SOURCE", linkedToFlags: 1, loadScreenId: 0 },
    });

    expect(result).toEqual({
      linkedTarget: "legacy",
      linkedModule: "module",
      linkedTag: "tag",
      linkedWaypoint: "waypoint",
      loadScreen: "screen",
      flags: { legacy: true },
      extra: { transitionDestination: "LEGACY" },
    });
    expect(result).not.toHaveProperty("storage");
  });
});

function exactSource(): SceneObjectSourceMetadata {
  return {
    type: "aurora_git",
    sourceKind: "door",
    sourceIndex: 0,
    sourceObjectId: "obj_door_0",
    doorTransitionStorage: { linkedTo: " SOURCE ", linkedToFlags: 1, loadScreenId: 0 },
  };
}
