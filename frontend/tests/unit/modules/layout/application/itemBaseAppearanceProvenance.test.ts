import { describe, expect, it } from "vitest";

import {
  canEditExistingItemBaseAppearance,
  isExistingItemBaseAppearanceTargetComplete,
  materializeExistingItemBaseAppearance,
  reduceExistingItemBaseItemDraft,
} from "../../../../../src/modules/layout/application/itemBaseAppearanceProvenance";
import { buildItemPropertiesDraft } from
  "../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import type { SceneObject } from "../../../../../src/modules/scene/contracts";
import { createNewSceneObject } from "../../../../../src/modules/scene/domain/sceneFactory";

const colors = {
  leather1: 1, leather2: 2, cloth1: 3, cloth2: 4, metal1: 5, metal2: 6,
} as const;

function catalog() {
  return {
    descriptor: {
      resourceName: "baseitems.2da" as const,
      sourceObjectKey: "modules/current/baseitems.2da",
      sourceLayer: "module" as const,
      sha256: "b".repeat(64),
      sizeBytes: 4096,
      rowCount: 3,
    },
    rows: [
      { rowIndex: 0, modelType: 0 as const, displayName: "Simple" },
      { rowIndex: 1, modelType: 1 as const, displayName: "Layered" },
      { rowIndex: 2, modelType: 2 as const, displayName: "Weapon" },
    ],
  };
}

function retainedItem(): SceneObject {
  return {
    ...createNewSceneObject("items", 1, 2, 3),
    id: "area:item:0",
    source: {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "item:0",
      itemBaseAppearance: {
        expectedValue: {
          baseItem: 0,
          modelType: 0,
          appearance: { modelPart1: 66 },
        },
        tableSha256: "b".repeat(64),
        tableRowCount: 3,
      },
    },
    itemProperties: {
      baseItem: 0,
      modelPart1: 66,
      baseAppearance: {
        baseItem: 0,
        modelType: 0,
        appearance: { modelPart1: 66 },
      },
    },
  };
}

describe("retained ground-Item BaseItem/appearance provenance", () => {
  it("activates only a matching exact catalog binding", () => {
    const item = retainedItem();
    expect(canEditExistingItemBaseAppearance(item.source, catalog())).toBe(true);
    expect(canEditExistingItemBaseAppearance(item.source, {
      ...catalog(),
      descriptor: { ...catalog().descriptor, sha256: "c".repeat(64) },
    })).toBe(false);
  });

  it("clears appearance fields when Base Item crosses ModelType", () => {
    const item = retainedItem();
    const draft = {
      ...buildItemPropertiesDraft(item),
      modelPart2: 12,
      modelPart3: 13,
      armorParts: { torso: 8 },
      materialColors: { ...colors },
    };

    expect(reduceExistingItemBaseItemDraft(item.source, draft, 2, catalog())).toMatchObject({
      baseItem: 2,
      modelPart1: undefined,
      modelPart2: undefined,
      modelPart3: undefined,
      armorParts: {},
      materialColors: {},
    });
    expect(reduceExistingItemBaseItemDraft(item.source, draft, 0, catalog())).toMatchObject({
      baseItem: 0,
      modelPart1: 66,
      modelPart2: 12,
      modelPart3: 13,
      armorParts: { torso: 8 },
      materialColors: colors,
    });
  });

  it("blocks an incomplete target and materializes a complete cross-profile target", () => {
    const item = retainedItem();
    const incomplete = reduceExistingItemBaseItemDraft(
      item.source,
      buildItemPropertiesDraft(item),
      1,
      catalog(),
    );
    expect(isExistingItemBaseAppearanceTargetComplete(
      item.source,
      incomplete,
      catalog(),
    )).toBe(false);
    expect(materializeExistingItemBaseAppearance(
      item.source,
      item.itemProperties,
      incomplete,
      catalog(),
    )).toEqual(item.itemProperties);

    const complete = {
      ...incomplete,
      modelPart1: 7,
      materialColors: { ...colors },
    };
    expect(isExistingItemBaseAppearanceTargetComplete(
      item.source,
      complete,
      catalog(),
    )).toBe(true);
    expect(materializeExistingItemBaseAppearance(
      item.source,
      item.itemProperties,
      complete,
      catalog(),
    )).toMatchObject({
      baseItem: 1,
      modelPart1: 7,
      materialColors: colors,
      baseAppearance: {
        baseItem: 1,
        modelType: 1,
        appearance: { modelPart1: 7, materialColors: colors },
      },
    });
  });
});
