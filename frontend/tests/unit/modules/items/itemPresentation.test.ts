import { describe, expect, it } from "vitest";
import type { SceneObject } from "../../../../src/modules/scene/contracts";
import {
  buildItemPltPaletteRowsByLayer,
  formatItemPropertyEntry,
  resolveItemArmorParts,
  resolveItemArmorMaterialColorSlot,
  resolveItemMaterialColors,
  resolveItemModelParts,
  summarizeItemAssembly
} from "../../../../src/modules/items/application/itemPresentation";

function createItemObject(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    id: "itm_template_cnr_b_dagger",
    kind: "items",
    name: "Bronze Skinning Knife",
    resRef: "cnr_b_dagger",
    tag: "CNR_B_DAGGER",
    x: 0.5,
    y: 0.5,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    },
    ...overrides
  };
}

describe("itemPresentation", () => {
  it("resolves item model parts and optional part resrefs", () => {
    const object = createItemObject({
      itemProperties: {
        baseItem: 22,
        baseItemLabel: "Dagger",
        baseItemModelType: "WDb",
        modelParts: [11, 13, 63],
        modelPartResRefs: ["wdb_b_011", "wdb_m_013", "wdb_t_063"]
      }
    });

    expect(resolveItemModelParts(object)).toEqual([
      { slot: "part1", label: "Part 1", value: 11, resRef: "wdb_b_011" },
      { slot: "part2", label: "Part 2", value: 13, resRef: "wdb_m_013" },
      { slot: "part3", label: "Part 3", value: 63, resRef: "wdb_t_063" }
    ]);
    expect(summarizeItemAssembly(object)).toBe("Dagger | Model WDb | Parts 11/13/63");
  });

  it("formats material colors and property rows", () => {
    const object = createItemObject({
      itemProperties: {
        materialColors: {
          leather1: 12,
          metal1: 16
        },
        propertyList: [
          {
            propertyName: 15,
            propertyLabel: "CastSpell",
            subtype: 66,
            subTypeTable: "iprp_spells",
            costTable: 3,
            costValue: 1,
            costTableDefinition: "iprp_chargecost"
          }
        ]
      }
    });

    expect(resolveItemMaterialColors(object)).toMatchObject([
      { slot: "leather1", label: "Leather 1", value: 12 },
      { slot: "metal1", label: "Metal 1", value: 16 }
    ]);
    expect(formatItemPropertyEntry(object.itemProperties!.propertyList![0])).toBe(
      "CastSpell (15) / iprp_spells:66 / iprp_chargecost:1"
    );
  });

  it("labels cloak model parts from cloakmodel runtime refs", () => {
    const object = createItemObject({
      itemProperties: {
        baseItem: 80,
        baseItemLabel: "cloak",
        baseItemModelType: "cloak",
        modelParts: [2],
        modelPartResRefs: ["pmh0_cloak_001"],
        modelPartResRefRoles: ["cloak"],
        cloakModel: 1,
        cloakTexture: 10,
        cloakIcon: 2
      }
    });

    expect(resolveItemModelParts(object)).toEqual([
      { slot: "part1", label: "Cloak", value: 2, resRef: "pmh0_cloak_001" }
    ]);
    expect(summarizeItemAssembly(object)).toBe(
      "cloak | Model cloak | Parts 2 | Cloak model 1"
    );
  });

  it("resolves armor body-part metadata", () => {
    const object = createItemObject({
      itemProperties: {
        baseItem: 16,
        armorParts: {
          torso: 42,
          belt: 7,
          rHand: 3
        }
      }
    });

    expect(resolveItemArmorParts(object)).toEqual([
      { slot: "torso", label: "Torso", value: 42 },
      { slot: "belt", label: "Belt", value: 7 },
      { slot: "rHand", label: "R Hand", value: 3 }
    ]);
    expect(summarizeItemAssembly(object)).toBe("Base 16 | Armor 3");
  });

  it("maps armor part fallbacks to Aurora material color groups", () => {
    expect(resolveItemArmorMaterialColorSlot("torso")).toBe("leather1");
    expect(resolveItemArmorMaterialColorSlot("pelvis")).toBe("leather2");
    expect(resolveItemArmorMaterialColorSlot("rShoul")).toBe("metal1");
    expect(resolveItemArmorMaterialColorSlot("lFArm")).toBe("metal2");
    expect(resolveItemArmorMaterialColorSlot("belt")).toBe("cloth2");
    expect(resolveItemArmorMaterialColorSlot("robe")).toBe("cloth1");
    expect(resolveItemArmorMaterialColorSlot("unknown-slot")).toBe("leather1");
  });

  it("builds PLT palette rows from item material colors", () => {
    expect(
      buildItemPltPaletteRowsByLayer({
        leather1: 5,
        leather2: 7,
        cloth1: 2,
        cloth2: 3,
        metal1: 17,
        metal2: 255
      })
    ).toEqual({
      2: 17,
      3: 175,
      4: 2,
      5: 3,
      6: 5,
      7: 7
    });
  });
});
