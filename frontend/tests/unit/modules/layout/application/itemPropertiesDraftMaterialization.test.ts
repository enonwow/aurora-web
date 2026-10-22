import { describe, expect, it } from "vitest";
import {
  buildItemPropertiesDraft,
  type ItemPropertiesDraft,
} from "../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { materializeItemPropertiesDraft } from
  "../../../../../src/modules/layout/application/itemPropertiesDraftMaterialization";
import type { SceneObject } from "../../../../../src/modules/scene/contracts";
import { createNewSceneObject } from
  "../../../../../src/modules/scene/domain/sceneFactory";

function sourceItem(id = "area:test:item:0"): SceneObject {
  return {
    ...createNewSceneObject("items", 2, 3, 9),
    id,
    name: "Retained name",
    tag: "RETAINED_TAG",
    resRef: "retained_item",
    source: {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "item:0",
    },
    itemProperties: {
      localizedName: "Retained localized name",
      localizedNameStrRef: 41,
      description: "Retained description",
      descriptionStrRef: 42,
      identifiedDescription: "Retained identified description",
      identifiedDescriptionStrRef: 43,
      comments: "Retained comments",
      paletteId: 3,
      baseItem: 16,
      modelPart1: 1,
      modelPart2: 2,
      modelPart3: 3,
      modelParts: [1, 2, 3],
      armorPreviewContext: {
        modelPrefix: "pmh0",
        label: "retained context",
        gender: 1,
        phenotype: 2,
        raceModel: "p_hhm",
      },
      cloakModelRow: 8,
      cloakModel: 12,
      cloakTexture: 34,
      cloakIcon: 56,
      cloakModelResRef: "retained_model",
      cloakTextureResRef: "retained_texture",
      cloakIconResRef: "retained_icon",
      armorParts: { torso: 43, pelvis: 8 },
      materialColors: { leather1: 5, metal1: 17 },
      cost: 100,
      addCost: 10,
      costTable: 2,
      costValue: 3,
      charges: 4,
      stackSize: 5,
      identified: true,
      stolen: false,
      plot: false,
      cursed: false,
      propertyList: [{
        propertyName: 1,
        subtype: 2,
        costTable: 3,
        costValue: 4,
        param1: 255,
        param1Value: 0,
        chanceAppear: 100,
      }],
      variables: [{ name: "RetainedVariable", type: "int", value: 1 }],
      scripts: { onAcquire: "retained_script" },
    },
  };
}

function mutatedDraft(source: SceneObject): ItemPropertiesDraft {
  return {
    ...buildItemPropertiesDraft(source),
    name: "Draft name",
    tag: "DRAFT_TAG",
    resRef: "draft_item",
    localizedName: "Draft localized name",
    localizedNameStrRef: 141,
    description: "Draft description",
    descriptionStrRef: 142,
    identifiedDescription: "Draft identified description",
    identifiedDescriptionStrRef: 143,
    comments: "Draft comments",
    paletteId: 9,
    baseItem: 99,
    modelPart1: 11,
    modelPart2: 12,
    modelPart3: 13,
    armorPreviewContext: {
      modelPrefix: "pfh0",
      label: "draft context",
      gender: "0",
      phenotype: "1",
      raceModel: "p_hhf",
    },
    cloakModelRow: 18,
    cloakModel: 112,
    cloakTexture: 134,
    cloakIcon: 156,
    cloakModelResRef: "draft_model",
    cloakTextureResRef: "draft_texture",
    cloakIconResRef: "draft_icon",
    armorParts: { torso: 99 },
    materialColors: { leather1: 99 },
    cost: 200,
    addCost: 20,
    costTable: 12,
    costValue: 13,
    charges: 14,
    stackSize: 15,
    identified: false,
    stolen: true,
    plot: true,
    cursed: true,
    propertyList: [{ propertyName: 43, chanceAppear: 50 }],
    variables: [{ name: "DraftVariable", type: "string", value: "draft" }],
    scripts: { onAcquire: "draft_script" },
  };
}

describe("materializeItemPropertiesDraft", () => {
  it("preserves every unproven field of a retained Area Item", () => {
    const source = sourceItem();
    const result = materializeItemPropertiesDraft(source, mutatedDraft(source));

    expect(result.policy).toBe("retained_exact_only");
    expect(result.object).toEqual(source);
    expect(result.object.itemProperties?.propertyList)
      .not.toBe(source.itemProperties?.propertyList);
    expect(result.object.itemProperties?.variables)
      .not.toBe(source.itemProperties?.variables);
  });

  it("changes exact retained fields but still preserves blueprint-only fields", () => {
    const source = sourceItem();
    source.source = {
      ...source.source!,
      itemTag: { present: true, value: source.tag },
      itemTemplateResRef: {
        present: true,
        nativeType: "resref",
        value: source.resRef,
      },
      itemLocalizedStrings: {
        localizedName: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "UmV0YWluZWQgbG9jYWxpemVkIG5hbWU=" }],
        },
        description: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "UmV0YWluZWQgZGVzY3JpcHRpb24=" }],
        },
        identifiedDescription: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "UmV0YWluZWQgaWRlbnRpZmllZCBkZXNjcmlwdGlvbg==" }],
        },
      },
      itemEditorComment: "Retained comments",
      itemInstanceState: {
        presentFields: [
          "charges", "cost", "stolen", "stackSize",
          "plot", "addCost", "identified", "cursed",
        ],
        values: {
          charges: 4,
          cost: 100,
          stolen: false,
          stackSize: 5,
          plot: false,
          addCost: 10,
          identified: true,
          cursed: false,
        },
      },
      itemVariables: {
        expectedEntries: [{
          sourceIndex: 0,
          name: "RetainedVariable",
          type: "int",
          value: 1,
        }],
      },
    };

    const result = materializeItemPropertiesDraft(source, mutatedDraft(source));

    expect(result.object).toMatchObject({
      name: "Retained name",
      tag: "DRAFT_TAG",
      resRef: "draft_item",
      itemProperties: {
        localizedName: "Draft localized name",
        localizedNameStrRef: 41,
        description: "Draft description",
        descriptionStrRef: 42,
        identifiedDescription: "Draft identified description",
        identifiedDescriptionStrRef: 43,
        comments: "Draft comments",
        cost: 200,
        addCost: 20,
        charges: 14,
        stackSize: 15,
        identified: false,
        stolen: true,
        plot: true,
        cursed: true,
        baseItem: 16,
        modelPart1: 1,
        propertyList: [{
          propertyName: 1,
          subtype: 2,
          costTable: 3,
          costValue: 4,
          param1: 255,
          param1Value: 0,
          chanceAppear: 100,
        }],
        variables: [{ name: "DraftVariable", type: "string", value: "draft" }],
        scripts: { onAcquire: "retained_script" },
      },
    });
  });

  it("materializes complete ordered retained Item localized-string lists", () => {
    const source = sourceItem();
    source.source = {
      ...source.source!,
      itemLocalizedStrings: {
        localizedName: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [
            { languageId: 42, textBytesBase64: "TGVnYWN5IG5hbWU=" },
            { languageId: 0, textBytesBase64: "UmV0YWluZWQgbG9jYWxpemVkIG5hbWU=" },
            { languageId: 10, textBytesBase64: "UG9sc2thIG5hendh" },
          ],
        },
        description: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "UmV0YWluZWQgZGVzY3JpcHRpb24=" }],
        },
        identifiedDescription: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "UmV0YWluZWQgaWRlbnRpZmllZCBkZXNjcmlwdGlvbg==" }],
        },
      },
    };
    source.itemProperties = {
      ...source.itemProperties,
      localizedNameEntries: [
        { languageId: 42, text: "Legacy name" },
        { languageId: 0, text: "Retained localized name" },
        { languageId: 10, text: "Polska nazwa" },
      ],
      descriptionEntries: [{ languageId: 0, text: "Retained description" }],
      identifiedDescriptionEntries: [
        { languageId: 0, text: "Retained identified description" },
      ],
    };
    const draft = buildItemPropertiesDraft(source);
    draft.localizedName = "Draft localized name";
    draft.localizedNameEntries = [
      { languageId: 10, text: "Nazwa PL" },
      { languageId: 42, text: "Legacy changed" },
      { languageId: 0, text: "Draft localized name" },
      { languageId: 2, text: "German name" },
    ];
    draft.description = "Draft description";
    draft.descriptionEntries = [
      { languageId: 0, text: "Draft description" },
      { languageId: 2, text: "Beschreibung" },
    ];
    draft.identifiedDescription = "Draft identified description";
    draft.identifiedDescriptionEntries = [
      { languageId: 0, text: "Draft identified description" },
      { languageId: 10, text: "Rozpoznany opis" },
    ];

    const result = materializeItemPropertiesDraft(source, draft);

    expect(result.object.itemProperties).toMatchObject({
      localizedName: "Draft localized name",
      localizedNameEntries: draft.localizedNameEntries,
      description: "Draft description",
      descriptionEntries: draft.descriptionEntries,
      identifiedDescription: "Draft identified description",
      identifiedDescriptionEntries: draft.identifiedDescriptionEntries,
    });
    expect(result.object.itemProperties?.localizedNameEntries)
      .not.toBe(draft.localizedNameEntries);
  });

  it("materializes a complete retained PropertiesList target with exact source provenance", () => {
    const source = sourceItem();
    source.source = {
      ...source.source!,
      itemPropertyList: {
        present: true,
        expectedEntries: [{
          sourceIndex: 0,
          propertyName: 1,
          subtype: 2,
          costTable: 3,
          costValue: 4,
          param1: 255,
          param1Value: 0,
          chanceAppear: 100,
        }],
      },
    };
    const draft = mutatedDraft(source);
    draft.propertyList = [{
      propertyName: 48,
      subtype: 6,
      costTable: 24,
      costValue: 7,
      param1: 8,
      param1Value: 9,
      chanceAppear: 50,
    }];

    const result = materializeItemPropertiesDraft(source, draft);

    expect(result.object.itemProperties?.propertyList).toEqual(draft.propertyList);
    expect(result.object.itemProperties?.propertyList).not.toBe(draft.propertyList);
    expect(result.object.itemProperties?.propertyList?.[0]).not.toBe(draft.propertyList[0]);
  });

  it("preserves retained PropertiesList when provenance is absent or the target is incomplete", () => {
    const physicallyAbsent = sourceItem();
    physicallyAbsent.source = {
      ...physicallyAbsent.source!,
      itemPropertyList: { present: false, expectedEntries: [] },
    };
    const absentDraft = mutatedDraft(physicallyAbsent);
    absentDraft.propertyList = [{
      propertyName: 43,
      subtype: 2,
      costTable: 3,
      costValue: 4,
      param1: 5,
      param1Value: 6,
      chanceAppear: 100,
    }];
    expect(
      materializeItemPropertiesDraft(physicallyAbsent, absentDraft).object.itemProperties?.propertyList,
    ).toEqual(physicallyAbsent.itemProperties?.propertyList);

    const exact = sourceItem();
    exact.source = {
      ...exact.source!,
      itemPropertyList: {
        present: true,
        expectedEntries: [{
          sourceIndex: 0,
          propertyName: 1,
          subtype: 2,
          costTable: 3,
          costValue: 4,
          param1: 255,
          param1Value: 0,
          chanceAppear: 100,
        }],
      },
    };
    const incompleteDraft = mutatedDraft(exact);
    incompleteDraft.propertyList = [{ propertyName: 43 }];
    expect(
      materializeItemPropertiesDraft(exact, incompleteDraft).object.itemProperties?.propertyList,
    ).toEqual(exact.itemProperties?.propertyList);
  });

  it("materializes retained ItemList reorder, coordinates, and removal as a detached target", () => {
    const source = sourceItem();
    const inventoryItems = [
      { sourceIndex: 0, resRef: "nw_it_gold001", x: 1, y: 2 },
      { sourceIndex: 1, resRef: "nw_it_gem001", x: 3, y: 4 },
    ];
    source.source = { ...source.source!, itemInventoryItems: inventoryItems };
    source.itemProperties = {
      ...source.itemProperties,
      inventoryItems: inventoryItems.map((entry) => ({ ...entry })),
    };
    const draft = mutatedDraft(source);
    draft.inventoryItems = [{ ...inventoryItems[1]!, x: 12, y: 13 }];

    const result = materializeItemPropertiesDraft(source, draft);

    expect(result.object.itemProperties?.inventoryItems).toEqual(draft.inventoryItems);
    expect(result.object.itemProperties?.inventoryItems).not.toBe(draft.inventoryItems);
    expect(result.object.itemProperties?.inventoryItems?.[0]).not.toBe(draft.inventoryItems[0]);
    expect(source.source.itemInventoryItems?.[0]?.x).toBe(1);
  });

  it("preserves retained ItemList when exact provenance is absent or target identity changes", () => {
    const source = sourceItem();
    const inventoryItems = [
      { sourceIndex: 0, resRef: "nw_it_gold001", x: 1, y: 2 },
    ];
    source.itemProperties = {
      ...source.itemProperties,
      inventoryItems: inventoryItems.map((entry) => ({ ...entry })),
    };
    const noProvenanceDraft = mutatedDraft(source);
    noProvenanceDraft.inventoryItems = [];
    expect(materializeItemPropertiesDraft(source, noProvenanceDraft).object.itemProperties
      ?.inventoryItems).toEqual(inventoryItems);

    source.source = { ...source.source!, itemInventoryItems: inventoryItems };
    const changedIdentityDraft = mutatedDraft(source);
    changedIdentityDraft.inventoryItems = [{ ...inventoryItems[0]!, resRef: "different" }];
    expect(materializeItemPropertiesDraft(source, changedIdentityDraft).object.itemProperties
      ?.inventoryItems).toEqual(inventoryItems);
  });

  it("materializes a complete catalog-bound retained BaseItem/appearance target atomically", () => {
    const source = sourceItem();
    source.itemProperties = {
      ...source.itemProperties,
      baseItem: 0,
      modelPart1: 66,
      modelPart2: undefined,
      modelPart3: undefined,
      modelParts: [66],
      armorParts: undefined,
      materialColors: undefined,
      baseAppearance: {
        baseItem: 0,
        modelType: 0,
        appearance: { modelPart1: 66 },
      },
    };
    source.source = {
      ...source.source!,
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
    const catalog = {
      descriptor: {
        resourceName: "baseitems.2da" as const,
        sourceObjectKey: "modules/current/baseitems.2da",
        sourceLayer: "module" as const,
        sha256: "b".repeat(64),
        sizeBytes: 4096,
        rowCount: 2,
      },
      rows: [
        { rowIndex: 0, modelType: 0 as const, displayName: "Simple" },
        { rowIndex: 1, modelType: 2 as const, displayName: "Weapon" },
      ],
    };
    const draft = {
      ...buildItemPropertiesDraft(source),
      baseItem: 1,
      modelPart1: 7,
      modelPart2: 8,
      modelPart3: 9,
      armorParts: {},
      materialColors: {},
    };

    const result = materializeItemPropertiesDraft(source, draft, catalog);

    expect(result.object.itemProperties).toMatchObject({
      baseItem: 1,
      modelPart1: 7,
      modelPart2: 8,
      modelPart3: 9,
      modelParts: [7, 8, 9],
      baseAppearance: {
        baseItem: 1,
        modelType: 2,
        appearance: { modelPart1: 7, modelPart2: 8, modelPart3: 9 },
      },
    });
    expect(result.object.itemProperties?.armorParts).toBeUndefined();
    expect(result.object.itemProperties?.materialColors).toBeUndefined();
  });

  it("preserves the retained BaseItem/appearance vector when the target is incomplete", () => {
    const source = sourceItem();
    source.itemProperties = {
      ...source.itemProperties,
      baseItem: 0,
      modelPart1: 66,
      baseAppearance: {
        baseItem: 0,
        modelType: 0,
        appearance: { modelPart1: 66 },
      },
    };
    source.source = {
      ...source.source!,
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
    const catalog = {
      descriptor: {
        resourceName: "baseitems.2da" as const,
        sourceObjectKey: "modules/current/baseitems.2da",
        sourceLayer: "module" as const,
        sha256: "b".repeat(64),
        sizeBytes: 4096,
        rowCount: 2,
      },
      rows: [
        { rowIndex: 0, modelType: 0 as const, displayName: "Simple" },
        { rowIndex: 1, modelType: 2 as const, displayName: "Weapon" },
      ],
    };
    const draft = {
      ...buildItemPropertiesDraft(source),
      baseItem: 1,
      modelPart1: undefined,
      modelPart2: undefined,
      modelPart3: undefined,
    };

    expect(materializeItemPropertiesDraft(source, draft, catalog).object.itemProperties)
      .toEqual(source.itemProperties);
  });

  it("materializes supported UTI fields only for an Item-wizard blueprint", () => {
    const source = sourceItem("itm_wizard_retained_item_1");
    const result = materializeItemPropertiesDraft(source, mutatedDraft(source));

    expect(result.policy).toBe("wizard_blueprint");
    expect(result.object).toMatchObject({
      name: "Draft name",
      tag: "DRAFT_TAG",
      resRef: "draft_item",
      itemProperties: {
        localizedName: "Draft localized name",
        localizedNameStrRef: 141,
        description: "Draft description",
        descriptionStrRef: 142,
        identifiedDescription: "Draft identified description",
        identifiedDescriptionStrRef: 143,
        comments: "Draft comments",
        paletteId: 9,
        baseItem: 99,
        modelPart1: 11,
        modelPart2: 12,
        modelPart3: 13,
        modelParts: [11, 12, 13],
        armorPreviewContext: {
          modelPrefix: "pfh0",
          label: "draft context",
          gender: 0,
          phenotype: 1,
          raceModel: "p_hhf",
        },
        armorParts: { torso: 99 },
        materialColors: { leather1: 99 },
        propertyList: [{ propertyName: 43, chanceAppear: 50 }],
        variables: [{ name: "DraftVariable", type: "string", value: "draft" }],
        scripts: { onAcquire: "retained_script" },
      },
    });
  });

  it("materializes detached reference-form ItemList and Equip_ItemList only for a wizard blueprint", () => {
    const source = sourceItem("itm_wizard_nested_item_1");
    source.itemProperties = {
      ...source.itemProperties,
      blueprintInventoryItems: [{ resRef: "itm_old", x: 1, y: 2 }],
      blueprintEquippedItems: [{ resRef: "itm_old_ring", slotMask: 1 }],
    };
    const draft = buildItemPropertiesDraft(source);
    draft.blueprintInventoryItems = [
      { resRef: "itm_potion", x: 3, y: 4 },
      { resRef: "itm_scroll", x: 5, y: 6 },
    ];
    draft.blueprintEquippedItems = [{ resRef: "itm_ring", slotMask: 4 }];

    const result = materializeItemPropertiesDraft(source, draft);

    expect(result.object.itemProperties?.blueprintInventoryItems)
      .toEqual(draft.blueprintInventoryItems);
    expect(result.object.itemProperties?.blueprintEquippedItems)
      .toEqual(draft.blueprintEquippedItems);
    expect(result.object.itemProperties?.blueprintInventoryItems)
      .not.toBe(draft.blueprintInventoryItems);
    expect(result.object.itemProperties?.blueprintEquippedItems)
      .not.toBe(draft.blueprintEquippedItems);
    expect(source.itemProperties.blueprintInventoryItems?.[0]?.resRef).toBe("itm_old");
  });

  it("preserves the last complete Item-wizard VarTable when the draft target is invalid", () => {
    const source = sourceItem("itm_wizard_retained_item_2");
    const draft = mutatedDraft(source);
    draft.variables = [{ name: "Float", type: "float", value: 0.1 }];

    expect(materializeItemPropertiesDraft(source, draft).object.itemProperties?.variables)
      .toEqual(source.itemProperties?.variables);
  });
});
