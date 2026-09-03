import { describe, expect, it } from "vitest";
import {
  appendWizardItemEquipmentEntry,
  appendWizardItemInventoryEntry,
  appendExistingItemInventoryBlueprintEntry,
  canEditExistingItemInventory,
  listExistingItemInventoryBlueprintOptions,
  materializeExistingItemInventory,
  moveExistingItemInventoryEntry,
  moveWizardItemInventoryEntry,
  removeExistingItemInventoryEntry,
  removeWizardItemEquipmentEntry,
  removeWizardItemInventoryEntry,
  updateExistingItemInventoryCoordinate,
  updateWizardItemEquipmentEntry,
  updateWizardItemInventoryEntry,
} from "../../../../../src/modules/layout/application/itemInventoryProvenance";
import type {
  SceneObject,
  SceneObjectItemInventoryTargetEntry,
  SceneObjectSourceMetadata,
} from "../../../../../src/modules/scene/contracts";

const source: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "item",
  sourceIndex: 0,
  itemInventoryItems: [
    { sourceIndex: 0, resRef: "nw_it_gold001", x: 1, y: 2 },
    { sourceIndex: 1, resRef: "nw_it_gem001", x: 3, y: 4 },
  ],
};

const current: SceneObjectItemInventoryTargetEntry[] =
  source.itemInventoryItems!.map((entry) => ({ ...entry }));

const dynamicTemplate: SceneObject = {
  id: "itm_template_nw_cloth022",
  kind: "items",
  name: "Cloth Armor",
  resRef: "nw_cloth022",
  tag: "NW_CLOTH022",
  x: 0,
  y: 0,
  z: 0,
  bearing: 0,
  source: {
    type: "aurora_blueprint",
    sourceKind: "item",
    sourceProfileId: "effective-catalog-uti-item-copy-v1",
    templateId: "itm_nw_cloth022",
    templateResRef: "nw_cloth022",
    sourceObjectKey: "modules/current/items/nw_cloth022.uti",
    sourceSizeBytes: 4096,
    sourceEtag: "a".repeat(64),
    sourceFileType: "UTI ",
    sourceFileVersion: "V3.2",
    sourceStructTypeId: 0xffffffff,
  },
};

describe("itemInventoryProvenance", () => {
  it("admits retained GIT Item provenance with an exact present or absent ItemList", () => {
    expect(canEditExistingItemInventory(source)).toBe(true);
    expect(canEditExistingItemInventory({ ...source, itemInventoryItems: [] })).toBe(true);
    expect(canEditExistingItemInventory({ ...source, itemInventoryItems: undefined })).toBe(false);
    expect(canEditExistingItemInventory({ ...source, sourceKind: "placeable" })).toBe(false);
    expect(canEditExistingItemInventory({ ...source, type: "seed" })).toBe(false);
  });

  it("adds one exact dynamic catalog UTI target without mutating retained provenance", () => {
    const absentSource = { ...source, itemInventoryItems: [] };
    const next = appendExistingItemInventoryBlueprintEntry(
      absentSource,
      [],
      dynamicTemplate,
    );
    expect(next).toEqual([{
      resRef: "nw_cloth022",
      itemTemplateId: "itm_nw_cloth022",
      itemResRef: "nw_cloth022",
      itemSourceProfileId: "effective-catalog-uti-item-copy-v1",
      itemSourceObjectKey: "modules/current/items/nw_cloth022.uti",
      itemSourceSizeBytes: 4096,
      itemSourceFingerprint: "a".repeat(64),
      itemTag: "NW_CLOTH022",
      x: 0,
      y: 0,
    }]);
    expect(absentSource.itemInventoryItems).toEqual([]);
    expect(appendExistingItemInventoryBlueprintEntry(
      absentSource,
      next,
      { ...dynamicTemplate, source: { type: "seed" } },
    )).toBe(next);
  });

  it("lists only exact dynamic catalog UTI templates with stable deduplicated labels", () => {
    expect(listExistingItemInventoryBlueprintOptions([
      dynamicTemplate,
      { ...dynamicTemplate },
      { ...dynamicTemplate, id: "invalid_profile", source: { type: "seed" } },
    ])).toEqual([{
      templateObjectId: "itm_template_nw_cloth022",
      label: "Cloth Armor (nw_cloth022)",
    }]);
  });

  it("updates only Word coordinates and clamps finite numeric input", () => {
    expect(updateExistingItemInventoryCoordinate(source, current, 0, "x", 20.8))
      .toEqual([{ ...current[0], x: 20 }, current[1]]);
    expect(updateExistingItemInventoryCoordinate(source, current, 0, "y", -3))
      .toEqual([{ ...current[0], y: 0 }, current[1]]);
    expect(updateExistingItemInventoryCoordinate(source, current, 0, "x", 70_000))
      .toEqual([{ ...current[0], x: 65_535 }, current[1]]);
    expect(updateExistingItemInventoryCoordinate(source, current, 0, "x", Number.NaN))
      .toBe(current);
  });

  it("reorders and removes retained entries without mutating provenance", () => {
    expect(moveExistingItemInventoryEntry(source, current, 0, "down"))
      .toEqual([current[1], current[0]]);
    expect(removeExistingItemInventoryEntry(source, current, 0)).toEqual([current[1]]);
    expect(source.itemInventoryItems?.[0]?.x).toBe(1);
  });

  it("materializes a detached complete target and preserves current on invalid input", () => {
    const candidate = [{ ...current[1], x: 12, y: 13 }];
    const materialized = materializeExistingItemInventory(source, current, candidate);
    expect(materialized).toEqual(candidate);
    expect(materialized).not.toBe(candidate);
    expect(materialized?.[0]).not.toBe(candidate[0]);

    expect(materializeExistingItemInventory(source, current, [
      { ...current[0], resRef: "different" },
    ])).toEqual(current);
    expect(materializeExistingItemInventory({ ...source, itemInventoryItems: [] }, current, []))
      .toEqual([]);
  });

  it("authors detached wizard ItemList entries without retained-source authority", () => {
    const wizard = [{ resRef: "itm_potion", x: 1, y: 2 }];
    expect(appendWizardItemInventoryEntry(wizard, [])).toEqual([
      ...wizard,
      { resRef: "", x: 0, y: 0 },
    ]);
    expect(updateWizardItemInventoryEntry(wizard, 0, "resRef", "itm_scroll"))
      .toEqual([{ resRef: "itm_scroll", x: 1, y: 2 }]);
    expect(updateWizardItemInventoryEntry(wizard, 0, "x", 12))
      .toEqual([{ resRef: "itm_potion", x: 12, y: 2 }]);
    expect(moveWizardItemInventoryEntry(
      [...wizard, { resRef: "itm_scroll", x: 3, y: 4 }],
      0,
      "down",
    )).toEqual([
      { resRef: "itm_scroll", x: 3, y: 4 },
      wizard[0],
    ]);
    expect(removeWizardItemInventoryEntry(wizard, 0)).toEqual([]);
  });

  it("authors one unique one-hot Equip_ItemList entry per native ordered slot", () => {
    const equipped = [{ resRef: "itm_boots", slotMask: 4 }];
    expect(appendWizardItemEquipmentEntry([], equipped)).toEqual([
      { resRef: "", slotMask: 1 },
      equipped[0],
    ]);
    expect(updateWizardItemEquipmentEntry(equipped, 0, "resRef", "itm_new_boots"))
      .toEqual([{ resRef: "itm_new_boots", slotMask: 4 }]);
    expect(updateWizardItemEquipmentEntry(
      [{ resRef: "itm_head", slotMask: 1 }, ...equipped],
      1,
      "slotMask",
      1,
    )).toEqual([{ resRef: "itm_head", slotMask: 1 }, ...equipped]);
    expect(removeWizardItemEquipmentEntry(equipped, 0)).toEqual([]);
  });
});
