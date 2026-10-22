import { describe, expect, it } from "vitest";
import {
  areItemPropertiesDraftsEqual,
  buildItemPropertiesDraft
} from "../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import type { SceneObject } from "../../../../src/modules/scene/contracts";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("workspaceObjectPropertyDrafts item properties", () => {
  it("builds editable drafts from decompiled UTI item fields without sharing nested state", () => {
    const item: SceneObject = {
      ...createNewSceneObject("items", 1, 1, 7),
      id: "itm_hide_armor_007",
      name: "Hide Armor",
      tag: "NW_AARCLO08",
      resRef: "aaarcl008",
      itemProperties: {
        localizedName: "Custom Hide Armor",
        localizedNameEntries: [
          { languageId: 42, text: "Legacy name" },
          { languageId: 0, text: "Custom Hide Armor" },
          { languageId: 10, text: "Polska zbroja" }
        ],
        localizedNameStrRef: 12840,
        description: "Plain text description",
        descriptionEntries: [
          { languageId: 0, text: "Plain text description" },
          { languageId: 2, text: "Beschreibung" }
        ],
        descriptionStrRef: 2001,
        identifiedDescription: "Identified text",
        identifiedDescriptionEntries: [
          { languageId: 0, text: "Identified text" }
        ],
        identifiedDescriptionStrRef: 2002,
        comments: "Designer note",
        paletteId: 3,
        baseItem: 16,
        modelPart1: 66,
        modelPart2: 0,
        modelPart3: 0,
        armorPreviewContext: {
          modelPrefix: "pmh0",
          label: "male human",
          gender: 1,
          phenotype: 2,
          raceModel: "p_hhm"
        },
        armorParts: {
          torso: 43,
          pelvis: 8,
          rShoul: 15,
          lShoul: 15
        },
        materialColors: {
          leather1: 5,
          leather2: 7,
          metal1: 17
        },
        cost: 19463,
        charges: 1,
        stackSize: 1,
        identified: true,
        propertyList: [
          {
            propertyName: 1,
            propertyLabel: "AC Bonus",
            subtype: 2,
            costTable: 3,
            costValue: 4,
            param1: 255,
            param1Value: 0,
            chanceAppear: 100
          }
        ],
        scripts: {
          onAcquire: "nw_i0_acquire"
        }
      }
    };

    const draft = buildItemPropertiesDraft(item);

    expect(draft).toMatchObject({
      name: "Hide Armor",
      tag: "NW_AARCLO08",
      resRef: "aaarcl008",
      localizedName: "Custom Hide Armor",
      localizedNameEntries: [
        { languageId: 42, text: "Legacy name" },
        { languageId: 0, text: "Custom Hide Armor" },
        { languageId: 10, text: "Polska zbroja" }
      ],
      localizedNameStrRef: 12840,
      descriptionEntries: [
        { languageId: 0, text: "Plain text description" },
        { languageId: 2, text: "Beschreibung" }
      ],
      descriptionStrRef: 2001,
      identifiedDescriptionEntries: [
        { languageId: 0, text: "Identified text" }
      ],
      identifiedDescriptionStrRef: 2002,
      paletteId: 3,
      baseItem: 16,
      modelPart1: 66,
      armorPreviewContext: {
        modelPrefix: "pmh0",
        label: "male human",
        gender: "1",
        phenotype: "2",
        raceModel: "p_hhm"
      },
      armorParts: {
        torso: 43,
        pelvis: 8
      },
      materialColors: {
        leather1: 5,
        metal1: 17
      },
      cost: 19463,
      identified: true,
      scripts: {
        onAcquire: "nw_i0_acquire"
      }
    });
    expect(draft.propertyList[0]).toEqual({
      propertyName: 1,
      propertyLabel: "AC Bonus",
      subtype: 2,
      costTable: 3,
      costValue: 4,
      param1: 255,
      param1Value: 0,
      chanceAppear: 100
    });
    expect(draft.propertyList).not.toBe(item.itemProperties?.propertyList);
    expect(draft.propertyList[0]).not.toBe(item.itemProperties?.propertyList?.[0]);
    expect(draft.localizedNameEntries).not.toBe(item.itemProperties?.localizedNameEntries);
    expect(draft.localizedNameEntries?.[0]).not.toBe(
      item.itemProperties?.localizedNameEntries?.[0]
    );
    expect(draft.descriptionEntries).not.toBe(item.itemProperties?.descriptionEntries);
    expect(draft.identifiedDescriptionEntries).not.toBe(
      item.itemProperties?.identifiedDescriptionEntries
    );
    expect(areItemPropertiesDraftsEqual(draft, { ...draft, cost: 19463 })).toBe(true);
    expect(areItemPropertiesDraftsEqual(draft, { ...draft, cost: 19464 })).toBe(false);
  });
});
