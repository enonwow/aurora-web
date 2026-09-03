import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

describe("workspace Trigger LocalizedName cloning", () => {
  it("deeply detaches complete native provenance from the editable target", () => {
    const storage = {
      present: true as const,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
    };
    const object = {
      id: "trigger:0",
      kind: "triggers",
      resRef: "renderer_identity",
      triggerLocalizedName: "Inner Gate Trigger",
      source: {
        type: "aurora_git",
        sourceKind: "trigger",
        sourceIndex: 0,
        triggerLocalizedNameStorage: storage,
      },
      x: 0,
      y: 0,
      z: 0,
      bearing: 0,
      visualTransform: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        roll: 0,
        yaw: 0,
      },
    } as SceneObject;

    const cloned = cloneSceneObject(object);

    expect(cloned.triggerLocalizedName).toBe("Inner Gate Trigger");
    expect(cloned.source?.triggerLocalizedNameStorage).toEqual(storage);
    expect(cloned.source?.triggerLocalizedNameStorage).not.toBe(storage);
    if (cloned.source?.triggerLocalizedNameStorage?.present) {
      expect(cloned.source.triggerLocalizedNameStorage.entries).not.toBe(storage.entries);
    }
  });
});
