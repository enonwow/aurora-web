import { describe, expect, it } from "vitest";
import { cloneSceneObject } from "../../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../../src/modules/scene/domain/sceneFactory";
import { buildPlaceablePropertiesDraft } from "../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";

describe("existing Placeable localized-string storage preservation", () => {
  it("deep-clones both source members and ordered entries for cancel and undo snapshots", () => {
    const object = createNewSceneObject("placeables", 1, 2, 3);
    object.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      placeableLocalizedStrings: {
        locName: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [
            { languageId: 0, textBytesBase64: "Q2hlc3Q=" },
            { languageId: 0, textBytesBase64: "" },
          ],
        },
        description: { present: false },
      },
    };
    object.placeableProperties = {
      ...object.placeableProperties!,
      localizedName: "Chest",
      localizedNameEntries: [
        { languageId: 10, text: "Skrzynia" },
        { languageId: 0, text: "Chest" },
      ],
      description: "Storage",
      descriptionEntries: [
        { languageId: 0, text: "Storage" },
        { languageId: 2, text: "Stockage" },
      ],
    };

    const clone = cloneSceneObject(object);
    expect(clone.source?.placeableLocalizedStrings)
      .toEqual(object.source.placeableLocalizedStrings);
    expect(clone.source?.placeableLocalizedStrings)
      .not.toBe(object.source.placeableLocalizedStrings);
    expect(clone.source?.placeableLocalizedStrings?.locName)
      .not.toBe(object.source.placeableLocalizedStrings.locName);
    expect(clone.source?.placeableLocalizedStrings?.locName.present &&
      clone.source.placeableLocalizedStrings.locName.entries)
      .not.toBe(object.source.placeableLocalizedStrings.locName.present &&
        object.source.placeableLocalizedStrings.locName.entries);
    expect(clone.source?.placeableLocalizedStrings?.locName.present &&
      clone.source.placeableLocalizedStrings.locName.entries[0])
      .not.toBe(object.source.placeableLocalizedStrings.locName.present &&
        object.source.placeableLocalizedStrings.locName.entries[0]);
    expect(clone.placeableProperties).toEqual(object.placeableProperties);
    expect(clone.placeableProperties).not.toBe(object.placeableProperties);
    expect(clone.placeableProperties?.localizedNameEntries)
      .not.toBe(object.placeableProperties.localizedNameEntries);
    expect(clone.placeableProperties?.localizedNameEntries?.[0])
      .not.toBe(object.placeableProperties.localizedNameEntries?.[0]);
    expect(clone.placeableProperties?.descriptionEntries)
      .not.toBe(object.placeableProperties.descriptionEntries);

    const draft = buildPlaceablePropertiesDraft(object);
    expect(draft.localizedNameEntries).toEqual(object.placeableProperties.localizedNameEntries);
    expect(draft.localizedNameEntries).not.toBe(object.placeableProperties.localizedNameEntries);
    expect(draft.descriptionEntries).toEqual(object.placeableProperties.descriptionEntries);
    expect(draft.descriptionEntries).not.toBe(object.placeableProperties.descriptionEntries);
  });

  it("keeps an explicitly empty proven LocName distinct from the display-name fallback", () => {
    const object = createNewSceneObject("placeables", 1, 2, 4);
    object.name = "fallback";
    object.placeableProperties = { ...object.placeableProperties!, localizedName: "" };
    expect(buildPlaceablePropertiesDraft(object).name).toBe("");

    object.placeableProperties.localizedName = "Chest";
    expect(buildPlaceablePropertiesDraft(object).name).toBe("Chest");
  });
});
