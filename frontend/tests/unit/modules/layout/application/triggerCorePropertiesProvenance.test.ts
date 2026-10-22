import { describe, expect, it } from "vitest";
import {
  materializeExistingTriggerCoreProperties,
  readExistingTriggerCorePropertiesProvenance,
  reduceExistingTriggerCoreProperties,
} from "../../../../../src/modules/layout/application/triggerCorePropertiesProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

describe("existing Trigger core-properties provenance", () => {
  it("admits one exact retained Trigger ordinal without normalizing values", () => {
    const source = exactSource();
    const target = { ...source.triggerCoreProperties!, autoRemoveKey: 1 as const, keyName: " TARGET " };
    expect(readExistingTriggerCorePropertiesProvenance(source))
      .toEqual(source.triggerCoreProperties);
    expect(reduceExistingTriggerCoreProperties(
      source,
      source.triggerCoreProperties!,
      target,
    )).toEqual(target);
    expect(materializeExistingTriggerCoreProperties(
      source,
      source.triggerCoreProperties!,
      target,
    )).toEqual(target);
  });

  it.each([
    ["missing ordinal", (source: SceneObjectSourceMetadata) => { delete source.sourceIndex; }],
    ["wrong family", (source: SceneObjectSourceMetadata) => { source.sourceKind = "door"; }],
    ["wrong source", (source: SceneObjectSourceMetadata) => { source.type = "seed"; }],
    ["malformed tuple", (source: SceneObjectSourceMetadata) => {
      source.triggerCoreProperties = { ...source.triggerCoreProperties!, cursorId: 256 };
    }],
  ])("fails closed for %s", (_label, mutate) => {
    const source = exactSource();
    mutate(source);
    const current = exactCore();
    const target = { ...current, autoRemoveKey: 1 as const };

    expect(readExistingTriggerCorePropertiesProvenance(source)).toBeUndefined();
    expect(reduceExistingTriggerCoreProperties(source, current, target)).toBe(current);
    expect(materializeExistingTriggerCoreProperties(source, current, target)).toEqual(current);
  });
});

function exactCore() {
  return {
    autoRemoveKey: 0 as const,
    factionId: 1,
    cursorId: 2,
    highlightHeight: Math.fround(1.5),
    keyName: " SOURCE ",
    portraitId: 3,
    triggerType: 0,
  };
}

function exactSource(): SceneObjectSourceMetadata {
  return {
    type: "aurora_git",
    sourceKind: "trigger",
    sourceIndex: 0,
    sourceObjectId: "obj_trigger_0",
    triggerCoreProperties: exactCore(),
  };
}
