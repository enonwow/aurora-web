import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject ground-Item Tag", () => {
  it.each([
    [{ present: false }],
    [{ present: true, value: "  WEST_WALL_LOOT  " }],
  ] as const)("deep-clones exact presence-sensitive provenance %#", (storage) => {
    const item = createNewSceneObject("items", 1, 2, 1);
    item.source = {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:tag",
      itemTag: storage,
    };

    const cloned = cloneSceneObject(item);

    expect(cloned.source?.itemTag).toEqual(storage);
    expect(cloned.source?.itemTag).not.toBe(storage);
  });
});
