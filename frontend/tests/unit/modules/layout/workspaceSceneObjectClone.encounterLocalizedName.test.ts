import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

describe("workspace Encounter LocalizedName cloning", () => {
  it("deeply detaches complete native provenance from the editable target", () => {
    const storage = {
      present: true as const,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "R25vbGwgQW1idXNo" }],
    };
    const object = {
      id: "encounter:0",
      kind: "encounters",
      resRef: "x2_gnoll001",
      encounterLocalizedName: "Night Ambush",
      source: {
        type: "aurora_git",
        sourceKind: "encounter",
        sourceIndex: 0,
        encounterLocalizedNameStorage: storage,
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

    expect(cloned.encounterLocalizedName).toBe("Night Ambush");
    expect(cloned.source?.encounterLocalizedNameStorage).toEqual(storage);
    expect(cloned.source?.encounterLocalizedNameStorage).not.toBe(storage);
    if (cloned.source?.encounterLocalizedNameStorage?.present) {
      expect(cloned.source.encounterLocalizedNameStorage.entries).not.toBe(storage.entries);
    }
  });
});
