import { describe, expect, it } from "vitest";

import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject ground-Item BaseItem/appearance", () => {
  it("clones immutable provenance and the editable exact target independently", () => {
    const source = createNewSceneObject("items", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:base_appearance",
      itemBaseAppearance: {
        expectedValue: {
          baseItem: 0,
          modelType: 0,
          appearance: { modelPart1: 66 },
        },
        tableSha256: "b".repeat(64),
        tableRowCount: 2,
      },
    };
    source.itemProperties = {
      baseItem: 1,
      modelPart1: 7,
      modelPart2: 8,
      modelPart3: 9,
      baseAppearance: {
        baseItem: 1,
        modelType: 2,
        appearance: { modelPart1: 7, modelPart2: 8, modelPart3: 9 },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.itemBaseAppearance).toEqual(source.source.itemBaseAppearance);
    expect(cloned.source?.itemBaseAppearance).not.toBe(source.source.itemBaseAppearance);
    expect(cloned.source?.itemBaseAppearance?.expectedValue.appearance)
      .not.toBe(source.source.itemBaseAppearance.expectedValue.appearance);
    expect(cloned.itemProperties?.baseAppearance)
      .toEqual(source.itemProperties.baseAppearance);
    expect(cloned.itemProperties?.baseAppearance)
      .not.toBe(source.itemProperties.baseAppearance);
    expect(cloned.itemProperties?.baseAppearance?.appearance)
      .not.toBe(source.itemProperties.baseAppearance?.appearance);
  });
});
