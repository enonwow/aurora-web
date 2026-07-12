import { describe, expect, it } from "vitest";
import type { SceneObject } from "../../../../src/modules/scene/contracts";
import {
  ITEM_THUMBNAIL_DEFAULT_MODEL_ROTATION_X_RADIANS,
  ITEM_THUMBNAIL_WEAPON_FRONT_ROTATION_Y_RADIANS,
  resolveItemThumbnailFrontConvention
} from "../../../../src/modules/items/application/itemThumbnailFrontConvention";

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

describe("itemThumbnailFrontConvention", () => {
  it("uses the Aurora CAPART front for assembled armor", () => {
    const convention = resolveItemThumbnailFrontConvention(
      buildItem({
        name: "Hide Armor",
        itemProperties: {
          baseItem: 16,
          baseItemLabel: "Hide Armor",
          baseItemModelType: "aarcl",
          armorParts: {
            torso: 43,
            pelvis: 8,
            rShoul: 15,
            lShoul: 15
          }
        }
      })
    );

    expect(convention.family).toBe("armor");
    expect(convention.cameraAxis).toBe("positive-z");
    expect(convention.modelRotation).toEqual({ x: 0, y: 0, z: 0 });
    expect(convention.source).toContain("capart");
  });

  it("looks at shield outside faces on the shield width/depth axes", () => {
    const convention = resolveItemThumbnailFrontConvention(
      buildItem({
        name: "Large Shield",
        itemProperties: {
          baseItem: 53,
          baseItemLabel: "Large Shield",
          baseItemModelType: "ashlw",
          baseItemDefaultIcon: "iashlw",
          modelParts: [1],
          modelPartResRefs: ["ashlw_001"]
        }
      })
    );

    expect(convention.family).toBe("shield");
    expect(convention.cameraAxis).toBe("negative-x");
    expect(convention.widthAxis).toBe("z");
    expect(convention.depthAxis).toBe("x");
  });

  it("keeps three-part weapon model framing separate from the Aurora 2D slot rotation", () => {
    const convention = resolveItemThumbnailFrontConvention(
      buildItem({
        name: "Longsword",
        itemProperties: {
          baseItem: 1,
          baseItemLabel: "Longsword",
          baseItemModelType: "wswls",
          baseItemDefaultIcon: "iw_sword",
          baseItemInvSlotWidth: 1,
          baseItemInvSlotHeight: 4,
          modelParts: [11, 12, 13],
          modelPartResRefs: ["w_swlss_011", "w_swlss_012", "w_swlss_013"]
        }
      })
    );

    expect(convention.family).toBe("weapon");
    expect(convention.cameraAxis).toBe("positive-z");
    expect(convention.modelRotation.y).toBeCloseTo(
      ITEM_THUMBNAIL_WEAPON_FRONT_ROTATION_Y_RADIANS
    );
    expect(convention.modelRotation.x).toBe(0);
    expect(convention.modelRotation.z).toBe(0);
    expect(convention.source).toContain("front-contract");
  });

  it("does not bake the Aurora diagonal slot angle into square weapon model framing", () => {
    const convention = resolveItemThumbnailFrontConvention(
      buildItem({
        name: "Dagger",
        itemProperties: {
          baseItem: 22,
          baseItemLabel: "Dagger",
          baseItemModelType: "wswdg",
          baseItemDefaultIcon: "iwswdg",
          baseItemInvSlotWidth: 1,
          baseItemInvSlotHeight: 1,
          modelParts: [11, 12, 13],
          modelPartResRefs: ["w_swdgs_011", "w_swdgs_012", "w_swdgs_013"]
        }
      })
    );

    expect(convention.family).toBe("weapon");
    expect(convention.modelRotation.y).toBeCloseTo(
      ITEM_THUMBNAIL_WEAPON_FRONT_ROTATION_Y_RADIANS
    );
    expect(convention.modelRotation.x).toBe(0);
    expect(convention.modelRotation.z).toBe(0);
    expect(convention.source).toContain("front-contract");
  });

  it("keeps Aurora DefaultModel items upright without treating them as weapons", () => {
    const convention = resolveItemThumbnailFrontConvention(
      buildItem({
        name: "Potion",
        itemProperties: {
          baseItem: 49,
          baseItemLabel: "Potion",
          baseItemModelType: "",
          baseItemDefaultIcon: "iit_mpotion",
          modelParts: [2],
          modelPartResRefs: ["it_mpotion002"],
          modelPartResRefRoles: ["default"]
        }
      })
    );

    expect(convention.family).toBe("default-model");
    expect(convention.cameraAxis).toBe("positive-z");
    expect(convention.modelRotation.x).toBeCloseTo(
      ITEM_THUMBNAIL_DEFAULT_MODEL_ROTATION_X_RADIANS
    );
  });

  it("keeps Aurora torch CanRotateIcon metadata out of weapon rules while using an upright side view", () => {
    const convention = resolveItemThumbnailFrontConvention(
      buildItem({
        name: "Torch",
        itemProperties: {
          baseItem: 15,
          baseItemLabel: "Torch",
          baseItemModelType: "it_torch",
          baseItemDefaultModel: "it_bag",
          baseItemDefaultIcon: "iit_torch_000",
          modelParts: [1],
          modelPartResRefs: ["it_torch001"],
          baseItemCanRotateIcon: 1
        } as NonNullable<SceneObject["itemProperties"]> & { baseItemCanRotateIcon: 1 }
      })
    );

    expect(convention.family).toBe("single-upright");
    expect(convention.cameraAxis).toBe("positive-z");
    expect(convention.modelRotation.x).toBeCloseTo(
      ITEM_THUMBNAIL_DEFAULT_MODEL_ROTATION_X_RADIANS
    );
    expect(convention.modelRotation.y).toBe(0);
  });

  it("uses cloak-specific front rules before generic single mesh fallback", () => {
    const convention = resolveItemThumbnailFrontConvention(
      buildItem({
        name: "Cloak",
        itemProperties: {
          baseItem: 80,
          baseItemLabel: "Cloak",
          baseItemModelType: "cloak",
          baseItemDefaultIcon: "icloak_m_001",
          modelParts: [1],
          modelPartResRefs: ["pmb0_cloak001"],
          modelPartResRefRoles: ["cloak"]
        }
      })
    );

    expect(convention.family).toBe("cloak");
    expect(convention.cameraAxis).toBe("positive-z");
    expect(convention.modelRotation).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("falls back to authored-front single meshes when no Aurora class overrides apply", () => {
    const convention = resolveItemThumbnailFrontConvention(
      buildItem({
        name: "Ring",
        itemProperties: {
          baseItem: 52,
          baseItemLabel: "Ring",
          baseItemModelType: "",
          baseItemDefaultIcon: "iit_ring",
          modelParts: [1],
          modelPartResRefs: ["it_ring001"]
        }
      })
    );

    expect(convention.family).toBe("single");
    expect(convention.cameraAxis).toBe("positive-z");
    expect(convention.modelRotation).toEqual({ x: 0, y: 0, z: 0 });
  });
});
