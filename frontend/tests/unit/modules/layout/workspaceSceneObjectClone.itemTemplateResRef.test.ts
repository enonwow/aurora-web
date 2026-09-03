import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject ground-Item TemplateResRef", () => {
  it.each([
    [{ present: false }],
    [{ present: true, nativeType: "resref", value: "nw_sword" }],
  ] as const)("deep-clones exact presence-sensitive provenance %#", (storage) => {
    const item = createNewSceneObject("items", 1, 2, 1);
    item.source = {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:template_resref",
      itemTemplateResRef: storage,
    };

    const cloned = cloneSceneObject(item);

    expect(cloned.source?.itemTemplateResRef).toEqual(storage);
    expect(cloned.source?.itemTemplateResRef).not.toBe(storage);
  });
});
