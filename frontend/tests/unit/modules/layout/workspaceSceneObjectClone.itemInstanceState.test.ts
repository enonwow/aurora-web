import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject ground-item instance state", () => {
  it("deep-clones exact presence and value provenance independently from the editable target", () => {
    const item = createNewSceneObject("items", 1, 2, 1);
    const storage = {
      presentFields: ["charges", "plot"] as const,
      values: {
        charges: 7,
        cost: 0,
        stolen: false,
        stackSize: 1,
        plot: true,
        addCost: 0,
        identified: false,
        cursed: false,
      },
    };
    item.source = {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:state",
      itemInstanceState: storage,
    };
    item.itemProperties = {
      ...(item.itemProperties ?? {}),
      charges: 8,
      cost: 12,
      stolen: true,
      stackSize: 2,
      plot: false,
      addCost: 3,
      identified: true,
      cursed: true,
    };

    const cloned = cloneSceneObject(item);

    expect(cloned.source?.itemInstanceState).toEqual(storage);
    expect(cloned.source?.itemInstanceState).not.toBe(storage);
    expect(cloned.source?.itemInstanceState?.presentFields).not.toBe(storage.presentFields);
    expect(cloned.source?.itemInstanceState?.values).not.toBe(storage.values);
    expect(cloned.itemProperties).not.toBe(item.itemProperties);
  });
});
