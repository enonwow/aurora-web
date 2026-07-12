import { describe, expect, it } from "vitest";
import type { SceneObject } from "../../../../src/modules/scene/contracts";
import { resolveItemThumbnail2dContract } from "../../../../src/modules/items/application/itemThumbnail2dContract";

function buildItem(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    id: "item-template",
    kind: "items",
    name: "Item",
    resRef: "item",
    tag: "ITEM",
    previewImageUrl: "",
    x: 0,
    y: 0,
    z: 0,
    bearing: 0,
    itemProperties: {
      baseItem: 0,
      baseItemLabel: "Item",
      baseItemModelType: "",
      baseItemDefaultIcon: "",
      modelParts: [],
      modelPartResRefs: [],
      modelPartResRefRoles: []
    },
    ...overrides
  };
}

describe("itemThumbnail2dContract", () => {
  it("uses Aurora baseitems 1x4 weapon icon contract for longswords", () => {
    const contract = resolveItemThumbnail2dContract(
      buildItem({
        name: "Longsword",
        itemProperties: {
          baseItem: 1,
          baseItemLabel: "Longsword",
          baseItemModelType: "wswls",
          baseItemDefaultIcon: "iwswls",
          baseItemInvSlotWidth: 1,
          baseItemInvSlotHeight: 4,
          baseItemCanRotateIcon: 1,
          modelParts: [11, 12, 13],
          modelPartResRefs: ["w_swlss_011", "w_swlss_012", "w_swlss_013"]
        }
      })
    );

    expect(contract.family).toBe("weapon");
    expect(contract.defaultIcon).toBe("iwswls");
    expect(contract.slotWidth).toBe(1);
    expect(contract.slotHeight).toBe(4);
    expect(contract.canRotateIcon).toBe(1);
    expect(contract.renderedImageRotationDegrees).toBe(90);
    expect(contract.rotationReason).toBe("aurora-weapon-vertical-slot");
  });

  it("uses Aurora square weapon icon contract for daggers", () => {
    const contract = resolveItemThumbnail2dContract(
      buildItem({
        name: "Dagger",
        itemProperties: {
          baseItem: 22,
          baseItemLabel: "Dagger",
          baseItemModelType: "wswdg",
          baseItemDefaultIcon: "iwswdg",
          baseItemInvSlotWidth: 1,
          baseItemInvSlotHeight: 1,
          baseItemCanRotateIcon: 0,
          modelParts: [11, 12, 13],
          modelPartResRefs: ["w_swdgs_011", "w_swdgs_012", "w_swdgs_013"]
        }
      })
    );

    expect(contract.family).toBe("weapon");
    expect(contract.defaultIcon).toBe("iwswdg");
    expect(contract.canRotateIcon).toBe(0);
    expect(contract.renderedImageRotationDegrees).toBe(45);
    expect(contract.rotationReason).toBe("aurora-weapon-square-slot-diagonal");
  });

  it("keeps Aurora shield front icons unrotated", () => {
    const contract = resolveItemThumbnail2dContract(
      buildItem({
        name: "Large Shield",
        itemProperties: {
          baseItem: 56,
          baseItemLabel: "Large Shield",
          baseItemModelType: "ashlw",
          baseItemDefaultIcon: "iashlw",
          baseItemInvSlotWidth: 2,
          baseItemInvSlotHeight: 3,
          baseItemCanRotateIcon: 0,
          modelParts: [1],
          modelPartResRefs: ["ashlw_001"]
        }
      })
    );

    expect(contract.family).toBe("shield");
    expect(contract.slotAspectRatio).toBeCloseTo(0.666667);
    expect(contract.canRotateIcon).toBe(0);
    expect(contract.renderedImageRotationDegrees).toBe(0);
    expect(contract.rotationReason).toBe("aurora-front-frame");
  });

  it("preserves Aurora torch CanRotateIcon without treating torches as weapons", () => {
    const contract = resolveItemThumbnail2dContract(
      buildItem({
        name: "Torch",
        itemProperties: {
          baseItem: 15,
          baseItemLabel: "Torch",
          baseItemModelType: "it_torch",
          baseItemDefaultIcon: "iit_torch_000",
          baseItemInvSlotWidth: 1,
          baseItemInvSlotHeight: 3,
          baseItemCanRotateIcon: 1,
          modelParts: [1],
          modelPartResRefs: ["it_torch001"]
        }
      })
    );

    expect(contract.family).toBe("single-upright");
    expect(contract.defaultIcon).toBe("iit_torch_000");
    expect(contract.slotWidth).toBe(1);
    expect(contract.slotHeight).toBe(3);
    expect(contract.canRotateIcon).toBe(1);
    expect(contract.renderedImageRotationDegrees).toBe(0);
  });
});
