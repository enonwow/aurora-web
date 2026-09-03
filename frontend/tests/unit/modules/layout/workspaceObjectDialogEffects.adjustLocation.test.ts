import { describe, expect, it } from "vitest";
import {
  reconcileAdjustLocationDialogWithScene,
  reconcileItemPropertiesDialogWithScene
} from "../../../../src/modules/layout/application/useWorkspaceObjectDialogEffects";
import {
  buildItemPropertiesDraft
} from "../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { buildAdjustLocationDraft } from "../../../../src/modules/layout/application/workspaceSceneInteraction";
import type { SceneObject } from "../../../../src/modules/scene/contracts";
import {
  createNewSceneObject,
  createSeedAreaScene
} from "../../../../src/modules/scene/domain/sceneFactory";

describe("workspace object dialog effects Adjust Location", () => {
  it("refreshes a visible static placeable dialog with Visual Transform draft values", () => {
    const originalPlaceable: SceneObject = {
      ...createNewSceneObject("placeables", 3, 4, 101),
      id: "plc_static_adjust_location_001",
      isStatic: true
    };
    const livePlaceable: SceneObject = {
      ...originalPlaceable,
      visualTransform: {
        ...originalPlaceable.visualTransform,
        scale: 1.25,
        scaleX: 1.1,
        scaleY: 1.25,
        scaleZ: 1.4,
        offsetX: 0.4,
        offsetY: -0.3,
        offsetZ: 0.2,
        pitch: Math.PI / 12,
        yaw: Math.PI / 6,
        roll: Math.PI / 4
      }
    };
    const scene = {
      ...createSeedAreaScene(),
      objects: [livePlaceable]
    };
    const current = {
      objectIds: [originalPlaceable.id],
      snapshotObjects: [originalPlaceable],
      draft: buildAdjustLocationDraft(originalPlaceable, 10, scene.width, scene.height),
      showVisualTransforms: true,
      mixedStaticPlaceables: false,
      windowX: 100,
      windowY: 120,
      collapsed: false
    };

    const reconciled = reconcileAdjustLocationDialogWithScene({
      current,
      scene,
      visibleObjectIdsSet: new Set([livePlaceable.id]),
      adjustLocationUnitsPerTile: 10
    });

    expect(reconciled?.showVisualTransforms).toBe(true);
    expect(reconciled?.draft.scale).toBeCloseTo(1.25, 6);
    expect(reconciled?.draft.scaleX).toBeCloseTo(1.1, 6);
    expect(reconciled?.draft.scaleY).toBeCloseTo(1.25, 6);
    expect(reconciled?.draft.scaleZ).toBeCloseTo(1.4, 6);
    expect(reconciled?.draft.xTranslation).toBeCloseTo(4, 6);
    expect(reconciled?.draft.yTranslation).toBeCloseTo(-3, 6);
    expect(reconciled?.draft.zTranslation).toBeCloseTo(2, 6);
    expect(reconciled?.draft.xRotationDeg).toBeCloseTo(15, 6);
    expect(reconciled?.draft.yRotationDeg).toBeCloseTo(30, 6);
    expect(reconciled?.draft.zRotationDeg).toBeCloseTo(45, 6);
  });
});

describe("workspace object dialog effects item properties", () => {
  it("rebases the cancel snapshot when the live Item reaches the applied draft", () => {
    const originalItem: SceneObject = {
      ...createNewSceneObject("items", 2, 3, 202),
      id: "itm_area_applied_comment_202",
      itemProperties: {
        comments: ""
      }
    };
    const appliedItem: SceneObject = {
      ...originalItem,
      itemProperties: {
        ...originalItem.itemProperties,
        comments: "  applied\ncomment  "
      }
    };
    const current = {
      objectId: originalItem.id,
      snapshotObject: originalItem,
      draft: buildItemPropertiesDraft(appliedItem),
      activeTab: "comments" as const,
      windowX: 80,
      windowY: 90,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      collapsed: false
    };

    const reconciled = reconcileItemPropertiesDialogWithScene({
      current,
      sceneObjects: [appliedItem],
      visibleObjectIdsSet: new Set([appliedItem.id])
    });

    expect(reconciled?.draft.comments).toBe("  applied\ncomment  ");
    expect(reconciled?.snapshotObject.itemProperties?.comments).toBe(
      "  applied\ncomment  "
    );
    expect(reconciled?.snapshotObject).not.toBe(appliedItem);
  });

  it("refreshes visible item dialogs and closes them when the item leaves the visible subset", () => {
    const originalItem: SceneObject = {
      ...createNewSceneObject("items", 2, 3, 202),
      id: "itm_area_202",
      itemProperties: {
        localizedName: "Old Item",
        baseItem: 22,
        cost: 10,
        armorParts: { torso: 1 },
        materialColors: { leather1: 2 },
        propertyList: [{ propertyName: 1, propertyLabel: "Old" }]
      }
    };
    const liveItem: SceneObject = {
      ...originalItem,
      itemProperties: {
        ...originalItem.itemProperties,
        localizedName: "New Item",
        cost: 99,
        armorParts: { torso: 43 },
        materialColors: { leather1: 5 },
        propertyList: [{ propertyName: 2, propertyLabel: "New" }]
      }
    };
    const current = {
      objectId: originalItem.id,
      snapshotObject: originalItem,
      draft: buildItemPropertiesDraft(originalItem),
      activeTab: "basic" as const,
      windowX: 80,
      windowY: 90,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      collapsed: false
    };

    const refreshed = reconcileItemPropertiesDialogWithScene({
      current,
      sceneObjects: [liveItem],
      visibleObjectIdsSet: new Set([liveItem.id])
    });
    const hidden = reconcileItemPropertiesDialogWithScene({
      current,
      sceneObjects: [liveItem],
      visibleObjectIdsSet: new Set()
    });

    expect(refreshed?.draft.localizedName).toBe("New Item");
    expect(refreshed?.draft.cost).toBe(99);
    expect(refreshed?.draft.armorParts.torso).toBe(43);
    expect(refreshed?.draft.materialColors.leather1).toBe(5);
    expect(refreshed?.draft.propertyList[0]).toEqual({
      propertyName: 2,
      propertyLabel: "New"
    });
    expect(hidden).toBeNull();
  });
});
