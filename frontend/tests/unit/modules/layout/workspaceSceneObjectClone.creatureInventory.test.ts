import { describe, expect, it } from "vitest";
import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Creature inventory", () => {
  it("detaches immutable exact Creature Tag provenance", () => {
    const source = createNewSceneObject("creatures", 1, 2, 12);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureTag: { present: true, value: "  NW_CHICKEN  " },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureTag).toEqual(source.source.creatureTag);
    expect(cloned.source?.creatureTag).not.toBe(source.source.creatureTag);
  });

  it("detaches immutable exact Creature Conversation provenance", () => {
    const source = createNewSceneObject("creatures", 1, 2, 12);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureConversation: { present: true, value: "Guard_Dialog" },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureConversation).toEqual(
      source.source.creatureConversation,
    );
    expect(cloned.source?.creatureConversation).not.toBe(
      source.source.creatureConversation,
    );
  });

  it("detaches immutable exact Creature Interruptable provenance", () => {
    const source = createNewSceneObject("creatures", 1, 2, 12);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureInterruptable: { present: true, value: 1 },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureInterruptable).toEqual(
      source.source.creatureInterruptable,
    );
    expect(cloned.source?.creatureInterruptable).not.toBe(
      source.source.creatureInterruptable,
    );
  });

  it("detaches immutable exact Creature Appearance provenance and its table", () => {
    const source = createNewSceneObject("creatures", 1, 2, 12);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureAppearance: {
        present: true,
        nativeType: "word",
        value: 249,
        table: {
          resourceName: "appearance.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
          sourceLayer: "vanilla",
          sha256: "a".repeat(64),
          sizeBytes: 200_000,
          rowCount: 1_000,
          rowIndex: 249,
        },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureAppearance).toEqual(source.source.creatureAppearance);
    expect(cloned.source?.creatureAppearance).not.toBe(source.source.creatureAppearance);
    expect(cloned.source?.creatureAppearance?.present &&
      cloned.source.creatureAppearance.table).not.toBe(
        source.source.creatureAppearance.present && source.source.creatureAppearance.table,
      );
  });

  it("detaches immutable exact Creature Gender provenance and its table", () => {
    const source = createNewSceneObject("creatures", 1, 2, 12);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureGender: {
        present: true,
        nativeType: "byte",
        value: 4,
        table: {
          resourceName: "gender.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/gender.2da",
          sourceLayer: "vanilla",
          sha256: "c".repeat(64),
          sizeBytes: 250,
          rowCount: 5,
          rowIndex: 4,
        },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureGender).toEqual(source.source.creatureGender);
    expect(cloned.source?.creatureGender).not.toBe(source.source.creatureGender);
    expect(cloned.source?.creatureGender?.present &&
      cloned.source.creatureGender.table).not.toBe(
        source.source.creatureGender.present && source.source.creatureGender.table,
      );
  });

  it("detaches immutable ItemList provenance and its editable target", () => {
    const source = createNewSceneObject("creatures", 1, 2, 12);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureInventoryItems: [{
        sourceIndex: 0,
        resRef: "nw_cloth022",
        x: 0,
        y: 0,
        dropable: false,
        pickpocketable: false
      }]
    };
    source.creatureProperties!.inventoryItems = source.source.creatureInventoryItems.map(
      (entry) => ({ ...entry })
    );

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureInventoryItems).toEqual(
      source.source.creatureInventoryItems
    );
    expect(cloned.source?.creatureInventoryItems).not.toBe(
      source.source.creatureInventoryItems
    );
    expect(cloned.source?.creatureInventoryItems?.[0]).not.toBe(
      source.source.creatureInventoryItems[0]
    );
    expect(cloned.creatureProperties?.inventoryItems).toEqual(
      source.creatureProperties.inventoryItems
    );
    expect(cloned.creatureProperties?.inventoryItems).not.toBe(
      source.creatureProperties.inventoryItems
    );
  });

  it("detaches immutable Equip_ItemList provenance and its editable target", () => {
    const source = createNewSceneObject("creatures", 1, 2, 12);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureEquippedItems: [{
        sourceIndex: 0,
        resRef: "nw_helm001",
        slotMask: 1,
        dropable: false,
        pickpocketable: false
      }]
    };
    source.creatureProperties!.equippedItems = source.source.creatureEquippedItems.map(
      (entry) => ({ ...entry })
    );

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureEquippedItems).toEqual(
      source.source.creatureEquippedItems
    );
    expect(cloned.source?.creatureEquippedItems).not.toBe(
      source.source.creatureEquippedItems
    );
    expect(cloned.source?.creatureEquippedItems?.[0]).not.toBe(
      source.source.creatureEquippedItems[0]
    );
    expect(cloned.creatureProperties?.equippedItems).toEqual(
      source.creatureProperties.equippedItems
    );
    expect(cloned.creatureProperties?.equippedItems).not.toBe(
      source.creatureProperties.equippedItems
    );
  });
});
