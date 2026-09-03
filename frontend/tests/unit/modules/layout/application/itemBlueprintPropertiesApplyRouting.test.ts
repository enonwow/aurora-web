import { describe, expect, it } from "vitest";
import {
  resolveItemPropertiesApplyPersistenceRoute,
} from "../../../../../src/modules/layout/application/itemBlueprintPropertiesApplyRouting";
import type { SceneObject } from "../../../../../src/modules/scene/contracts";

function item(
  id: string,
  source: SceneObject["source"] = {
    type: "aurora_git",
    sourceKind: "item",
  },
): SceneObject {
  return {
    id,
    kind: "items",
    resRef: "test_item",
    tag: "TEST_ITEM",
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
    source,
  };
}

describe("resolveItemPropertiesApplyPersistenceRoute", () => {
  it("never publishes a retained Area ground Item as an Item blueprint", () => {
    const retained = item("area:test:item:0", {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      areaId: "test",
    });

    expect(resolveItemPropertiesApplyPersistenceRoute(
      "areas_mode",
      retained,
      retained,
    )).toEqual({ kind: "scene_only", reason: "area_workspace" });
  });

  it("keeps a placed wizard-derived Item instance scene-only in Areas mode", () => {
    const placed = item("obj_items_7", {
      type: "aurora_blueprint",
      sourceKind: "item",
      templateId: "itm_wizard_test_item_1",
    });

    expect(resolveItemPropertiesApplyPersistenceRoute(
      "areas_mode",
      placed,
      placed,
    )).toEqual({ kind: "scene_only", reason: "area_workspace" });
  });

  it("publishes only an Item-wizard template while Items mode owns the edit", () => {
    const wizard = item("itm_wizard_test_item_1");

    expect(resolveItemPropertiesApplyPersistenceRoute(
      "items_mode",
      wizard,
      wizard,
    )).toEqual({ kind: "blueprint", reason: "items_mode_wizard_template" });
  });

  it("does not publish a non-wizard catalog preview", () => {
    const catalogPreview = item("catalog:item:test_item");

    expect(resolveItemPropertiesApplyPersistenceRoute(
      "items_mode",
      catalogPreview,
      catalogPreview,
    )).toEqual({ kind: "scene_only", reason: "not_wizard_template" });
  });

  it("ignores a mismatched object family", () => {
    const wizard = item("itm_wizard_test_item_1");
    const creature = { ...wizard, kind: "creatures" as const };

    expect(resolveItemPropertiesApplyPersistenceRoute(
      "items_mode",
      creature,
      wizard,
    )).toEqual({ kind: "ignore", reason: "object_family_mismatch" });
  });
});
