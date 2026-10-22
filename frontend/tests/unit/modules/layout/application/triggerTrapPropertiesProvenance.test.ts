import { describe, expect, it } from "vitest";
import {
  materializeExistingTriggerTrapProperties,
  readExistingTriggerTrapPropertiesProvenance,
  reduceExistingTriggerTrapProperties,
} from "../../../../../src/modules/layout/application/triggerTrapPropertiesProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

describe("existing Trigger trap-properties provenance", () => {
  it("admits one exact retained Trigger ordinal without interpreting bytes", () => {
    const source = exactSource();
    const target = { ...source.triggerTrapProperties!, trapFlag: 1, trapType: 7 };
    expect(readExistingTriggerTrapPropertiesProvenance(source))
      .toEqual(source.triggerTrapProperties);
    expect(reduceExistingTriggerTrapProperties(
      source,
      source.triggerTrapProperties!,
      target,
    )).toEqual(target);
    expect(materializeExistingTriggerTrapProperties(
      source,
      source.triggerTrapProperties!,
      target,
    )).toEqual(target);
  });

  it.each([
    ["missing ordinal", (source: SceneObjectSourceMetadata) => { delete source.sourceIndex; }],
    ["wrong family", (source: SceneObjectSourceMetadata) => { source.sourceKind = "door"; }],
    ["wrong source", (source: SceneObjectSourceMetadata) => { source.type = "seed"; }],
    ["malformed tuple", (source: SceneObjectSourceMetadata) => {
      source.triggerTrapProperties = { ...source.triggerTrapProperties!, trapType: 256 };
    }],
  ])("fails closed for %s", (_label, mutate) => {
    const source = exactSource();
    mutate(source);
    const current = exactTrap();
    const target = { ...current, trapFlag: 1 };

    expect(readExistingTriggerTrapPropertiesProvenance(source)).toBeUndefined();
    expect(reduceExistingTriggerTrapProperties(source, current, target)).toBe(current);
    expect(materializeExistingTriggerTrapProperties(source, current, target)).toEqual(current);
  });
});

function exactTrap() {
  return {
    trapDetectable: 1,
    trapDetectDc: 0,
    trapDisarmable: 1,
    disarmDc: 15,
    trapFlag: 0,
    trapOneShot: 1,
    trapType: 0,
  };
}

function exactSource(): SceneObjectSourceMetadata {
  return {
    type: "aurora_git",
    sourceKind: "trigger",
    sourceIndex: 0,
    sourceObjectId: "obj_trigger_0",
    triggerTrapProperties: exactTrap(),
  };
}
