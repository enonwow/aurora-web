import { describe, expect, it } from "vitest";

import { createSceneMutationsFacade } from
  "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createNewSceneObject, createSeedAreaScene } from
  "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneMutationsFacade existing Trigger VarTable", () => {
  it("changes the complete ordered target and preserves immutable provenance", () => {
    const trigger = retainedTrigger();
    const scene = { ...createSeedAreaScene(), objects: [trigger] };
    const next = createSceneMutationsFacade().setExistingTriggerVariablesById(
      scene,
      trigger.id,
      [
        { name: "label", type: "string", value: "north" },
        { name: "scale", type: "float", value: Math.fround(1.5) },
      ],
    );
    expect(next).not.toBe(scene);
    expect(next.objects[0]?.triggerVariables).toEqual([
      { name: "label", type: "string", value: "north" },
      { name: "scale", type: "float", value: Math.fround(1.5) },
    ]);
    expect(next.objects[0]?.source).toBe(trigger.source);
    expect(next.objects[0]?.source?.triggerVariables)
      .toEqual(trigger.source.triggerVariables);
  });

  it("fails closed for malformed targets or missing exact provenance", () => {
    const trigger = retainedTrigger();
    const scene = { ...createSeedAreaScene(), objects: [trigger] };
    const facade = createSceneMutationsFacade();
    expect(facade.setExistingTriggerVariablesById(
      scene,
      trigger.id,
      [{ name: "x", type: "float", value: 0.1 }],
    )).toBe(scene);
    delete trigger.source?.triggerVariables;
    const unsupported = { ...scene, objects: [trigger] };
    expect(facade.setExistingTriggerVariablesById(unsupported, trigger.id, []))
      .toBe(unsupported);
  });
});

function retainedTrigger() {
  const trigger = createNewSceneObject("triggers", 1, 2, 1);
  trigger.id = "trigger-0";
  trigger.triggerVariables = [{ name: "counter", type: "int", value: 1 }];
  trigger.source = {
    type: "aurora_git",
    sourceKind: "trigger",
    sourceIndex: 0,
    sourceObjectId: "trigger:0",
    triggerVariables: { expectedEntries: [
      { sourceIndex: 0, name: "counter", type: "int", value: 1 },
    ] },
  };
  return trigger;
}
