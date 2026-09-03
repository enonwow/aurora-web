import { describe, expect, it } from "vitest";
import {
  materializeExistingTriggerTransitionStorage,
  readExistingTriggerTransitionStorageProvenance,
  reduceExistingTriggerTransitionStorage,
} from "../../../../../src/modules/layout/application/triggerTransitionStorageProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

describe("existing Trigger transition storage provenance", () => {
  it("admits one exact retained Trigger ordinal without normalizing text", () => {
    const source = exactSource();
    expect(readExistingTriggerTransitionStorageProvenance(source)).toEqual({
      linkedTo: " SOURCE ", linkedToFlags: 1, loadScreenId: 0,
    });
    expect(reduceExistingTriggerTransitionStorage(source, source.triggerTransitionStorage!, {
      linkedTo: " TARGET ", linkedToFlags: 2, loadScreenId: 7,
    })).toEqual({ linkedTo: " TARGET ", linkedToFlags: 2, loadScreenId: 7 });
    expect(materializeExistingTriggerTransitionStorage(
      source,
      source.triggerTransitionStorage!,
      { linkedTo: " TARGET ", linkedToFlags: 2, loadScreenId: 7 },
    )).toEqual({ linkedTo: " TARGET ", linkedToFlags: 2, loadScreenId: 7 });
  });

  it.each([
    ["missing ordinal", (source: SceneObjectSourceMetadata) => { delete source.sourceIndex; }],
    ["wrong family", (source: SceneObjectSourceMetadata) => { source.sourceKind = "door"; }],
    ["wrong source", (source: SceneObjectSourceMetadata) => { source.type = "seed"; }],
    ["malformed trio", (source: SceneObjectSourceMetadata) => {
      source.triggerTransitionStorage = {
        linkedTo: "SOURCE", linkedToFlags: 1,
      } as never;
    }],
  ])("fails closed for %s", (_label, mutate) => {
    const source = exactSource();
    mutate(source);
    const current = { linkedTo: " SOURCE ", linkedToFlags: 1, loadScreenId: 0 };
    const target = { linkedTo: " TARGET ", linkedToFlags: 2, loadScreenId: 7 };

    expect(readExistingTriggerTransitionStorageProvenance(source)).toBeUndefined();
    expect(reduceExistingTriggerTransitionStorage(source, current, target)).toBe(current);
    expect(materializeExistingTriggerTransitionStorage(source, current, target)).toEqual(current);
  });

  it("rejects malformed target and retains current storage", () => {
    const source = exactSource();
    const current = source.triggerTransitionStorage!;
    expect(reduceExistingTriggerTransitionStorage(source, current, {
      linkedTo: "TARGET", linkedToFlags: 256, loadScreenId: 7,
    })).toBe(current);
  });
});

function exactSource(): SceneObjectSourceMetadata {
  return {
    type: "aurora_git",
    sourceKind: "trigger",
    sourceIndex: 0,
    sourceObjectId: "obj_trigger_0",
    triggerTransitionStorage: {
      linkedTo: " SOURCE ", linkedToFlags: 1, loadScreenId: 0,
    },
  };
}
