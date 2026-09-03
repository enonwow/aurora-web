import { describe, expect, it } from "vitest";
import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject retained ground-Item static visual transform", () => {
  it("clones immutable source, native target, and presentation independently", () => {
    const sourceStorage = {
      present: true,
      value: {
        scaleX: 0.5,
        scaleY: 0.75,
        scaleZ: 1.25,
        rotateX: -15,
        rotateY: 30,
        rotateZ: 90,
        translateX: 20,
        translateY: -30,
        translateZ: 40,
      },
    } as const;
    const object = createNewSceneObject("items", 1, 2, 1);
    object.source = {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:visual_transform",
      itemVisualTransform: sourceStorage,
    };
    object.itemProperties = {
      visualTransform: {
        ...sourceStorage,
        value: { ...sourceStorage.value, translateZ: 50 },
      },
    };

    const cloned = cloneSceneObject(object);

    expect(cloned.source?.itemVisualTransform).toStrictEqual(object.source.itemVisualTransform);
    expect(cloned.source?.itemVisualTransform).not.toBe(object.source.itemVisualTransform);
    expect(cloned.itemProperties?.visualTransform)
      .toStrictEqual(object.itemProperties.visualTransform);
    expect(cloned.itemProperties?.visualTransform)
      .not.toBe(object.itemProperties.visualTransform);
    if (
      cloned.source?.itemVisualTransform?.present
      && object.source.itemVisualTransform.present
      && cloned.itemProperties?.visualTransform?.present
      && object.itemProperties.visualTransform?.present
    ) {
      expect(cloned.source.itemVisualTransform.value)
        .not.toBe(object.source.itemVisualTransform.value);
      expect(cloned.itemProperties.visualTransform.value)
        .not.toBe(object.itemProperties.visualTransform.value);
    }
    expect(cloned.visualTransform).not.toBe(object.visualTransform);
  });
});
