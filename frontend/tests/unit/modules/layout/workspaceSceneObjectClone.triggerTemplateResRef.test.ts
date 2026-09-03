import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Trigger TemplateResRef", () => {
  it.each([
    [{ present: false }],
    [{ present: true, nativeType: "resref", value: "newgeneric" }],
  ] as const)("deep-clones exact presence-sensitive provenance %#", (storage) => {
    const trigger = createNewSceneObject("triggers", 1, 2, 1) as any;
    trigger.triggerTemplateResRef = storage.present
      ? storage.value
      : undefined;
    trigger.source = {
      type: "aurora_git",
      sourceKind: "trigger",
      sourceIndex: 0,
      sourceObjectId: "trg:0:template_resref",
      triggerTemplateResRef: storage,
    };

    const cloned = cloneSceneObject(trigger) as any;

    expect(cloned.source?.triggerTemplateResRef).toEqual(storage);
    expect(cloned.source?.triggerTemplateResRef).not.toBe(storage);
    expect(cloned.triggerTemplateResRef).toBe(trigger.triggerTemplateResRef);
  });
});
