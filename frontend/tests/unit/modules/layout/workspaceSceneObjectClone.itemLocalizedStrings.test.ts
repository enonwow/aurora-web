import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject ground-item localized strings", () => {
  it("deep-clones exact native provenance independently from editable targets", () => {
    const item = createNewSceneObject("items", 1, 2, 1);
    const storage = {
      localizedName: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "U3dvcmQ=" }],
      },
      description: { present: false as const },
      identifiedDescription: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [],
      },
    };
    item.source = {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:localized_strings",
      itemLocalizedStrings: storage,
    };
    item.itemProperties = {
      ...(item.itemProperties ?? {}),
      localizedName: "Changed",
      description: "Changed description",
      identifiedDescription: "Changed identified description",
    };

    const cloned = cloneSceneObject(item);

    expect(cloned.source?.itemLocalizedStrings).toEqual(storage);
    expect(cloned.source?.itemLocalizedStrings).not.toBe(storage);
    expect(cloned.source?.itemLocalizedStrings?.localizedName)
      .not.toBe(storage.localizedName);
    expect(cloned.source?.itemLocalizedStrings?.localizedName.present &&
      cloned.source.itemLocalizedStrings.localizedName.entries)
      .not.toBe(storage.localizedName.entries);
    expect(cloned.itemProperties).not.toBe(item.itemProperties);
  });
});
