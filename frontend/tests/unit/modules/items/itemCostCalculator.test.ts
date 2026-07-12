import { describe, expect, it } from "vitest";
import { calculateAuroraItemCostBreakdown } from "../../../../src/modules/items/application/itemCostCalculator";

describe("itemCostCalculator", () => {
  it("combines base cost, armor part modifiers, CastSpell aggregation, multiplier and AddCost", () => {
    const breakdown = calculateAuroraItemCostBreakdown(
      {
        baseItemBaseCost: 10,
        baseItemItemMultiplier: 2,
        addCost: 25,
        armorParts: {
          torso: 43,
          pelvis: 8
        },
        armorPartCostModifiers: {
          torso: 5,
          pelvis: 3
        },
        propertyList: [
          { propertyName: 15, subtype: 66, costValue: 1 },
          { propertyName: 15, subtype: 67, costValue: 1 },
          { propertyName: 15, subtype: 68, costValue: 1 }
        ]
      },
      [
        {
          propertyName: 15,
          subtypeOptions: [
            { value: 66, cost: 100 },
            { value: 67, cost: 80 },
            { value: 68, cost: 20 }
          ],
          costValueOptions: [{ value: 1, cost: 2 }]
        }
      ]
    );

    expect(breakdown).toMatchObject({
      baseCost: 10,
      armorPartCostModifierTotal: 8,
      propertyCostSubtotal: 0,
      castSpellPropertyCostSubtotal: 340,
      preMultiplierSubtotal: 358,
      itemMultiplier: 2,
      multipliedSubtotal: 716,
      addCost: 25,
      finalCost: 741,
      resolvedPropertyCount: 3,
      unresolvedPropertyCount: 0,
      resolvedArmorPartCount: 2,
      unresolvedArmorPartCount: 0,
      castSpellPropertyCount: 3
    });
  });

  it("does not mark armor modifiers unresolved until a modifier table has been loaded", () => {
    const breakdown = calculateAuroraItemCostBreakdown({
      armorParts: {
        torso: 43
      }
    });

    expect(breakdown.unresolvedArmorPartCount).toBe(0);
    expect(breakdown.finalCost).toBe(0);
  });

  it("reports baseitems ILRStackSize status for stackable items", () => {
    const exceeds = calculateAuroraItemCostBreakdown({
      stackSize: 3,
      baseItemIlrStackSize: 1
    });
    expect(exceeds).toMatchObject({
      stackSize: 3,
      ilrStackSize: 1,
      ilrStackStatus: "exceeds-limit"
    });

    const withinLimit = calculateAuroraItemCostBreakdown({
      stackSize: 1,
      baseItemIlrStackSize: 1
    });
    expect(withinLimit.ilrStackStatus).toBe("within-limit");

    const notApplicable = calculateAuroraItemCostBreakdown({
      stackSize: 99
    });
    expect(notApplicable.ilrStackStatus).toBe("not-applicable");
  });

  it("multiplies the rounded Aurora subtotal by StackSize before AddCost", () => {
    const breakdown = calculateAuroraItemCostBreakdown({
      baseItemBaseCost: 10,
      baseItemItemMultiplier: 2,
      stackSize: 3,
      addCost: 5
    });

    expect(breakdown).toMatchObject({
      preMultiplierSubtotal: 10,
      multipliedSubtotal: 20,
      costStackSize: 3,
      stackMultipliedSubtotal: 60,
      addCost: 5,
      finalCost: 65
    });
  });

  it("uses baseitems Stacking as the retail cost fallback when StackSize is absent", () => {
    const breakdown = calculateAuroraItemCostBreakdown({
      baseItemBaseCost: 2,
      baseItemItemMultiplier: 1,
      baseItemStacking: 99
    });

    expect(breakdown).toMatchObject({
      multipliedSubtotal: 2,
      costStackSize: 99,
      stackMultipliedSubtotal: 198,
      finalCost: 198
    });
  });

  it("uses the Aurora PotionCost branch for CastSpell potion pricing", () => {
    const breakdown = calculateAuroraItemCostBreakdown(
      {
        baseItem: 49,
        baseItemBaseCost: 1,
        baseItemItemMultiplier: 0.2,
        propertyList: [{ propertyName: 15, subtype: 66, costTable: 3, costValue: 1 }]
      },
      [
        {
          propertyName: 15,
          subtypeOptions: [
            {
              value: 66,
              cost: 750,
              casterLevel: 2,
              innateLevel: 1,
              potionUse: true,
              wandUse: true,
              generalUse: true
            }
          ],
          costValueOptions: [{ value: 1, cost: 0.1334, potionCost: 1, wandCost: 1 }]
        }
      ]
    );

    expect(breakdown).toMatchObject({
      baseCost: 1,
      castSpellPropertyCostSubtotal: 100,
      preMultiplierSubtotal: 101,
      itemMultiplier: 0.2,
      multipliedSubtotal: 20,
      finalCost: 20,
      resolvedPropertyCount: 1,
      unresolvedPropertyCount: 0
    });
  });

  it("uses the Aurora scroll CastSpell branch for retail spell scroll pricing", () => {
    const breakdown = calculateAuroraItemCostBreakdown(
      {
        baseItem: 75,
        baseItemBaseCost: 1,
        baseItemItemMultiplier: 0.36,
        stackSize: 1,
        propertyList: [{ propertyName: 15, subtype: 184, costTable: 3, costValue: 1 }]
      },
      [
        {
          propertyName: 15,
          subtypeOptions: [
            {
              value: 184,
              cost: 4500,
              casterLevel: 3,
              innateLevel: 2,
              potionUse: false,
              wandUse: true,
              generalUse: true
            }
          ],
          costValueOptions: [{ value: 1, cost: 2 }]
        }
      ]
    );

    expect(breakdown).toMatchObject({
      baseCost: 1,
      castSpellPropertyCostSubtotal: 600,
      preMultiplierSubtotal: 601,
      itemMultiplier: 0.36,
      multipliedSubtotal: 216,
      finalCost: 216,
      resolvedPropertyCount: 1,
      unresolvedPropertyCount: 0
    });
  });

  it("resolves raw dictionary choice options by rowId when value is absent", () => {
    const breakdown = calculateAuroraItemCostBreakdown(
      {
        baseItem: 49,
        baseItemBaseCost: 1,
        baseItemItemMultiplier: 0.2,
        propertyList: [{ propertyName: 15, subtype: 66, costTable: 3, costValue: 1 }]
      },
      [
        {
          propertyName: 15,
          subtypeOptions: [
            {
              rowId: 66,
              value: -1,
              cost: 750,
              casterLevel: 2,
              innateLevel: 1,
              potionUse: true
            }
          ],
          costValueOptions: [{ rowId: 1, value: -1, cost: 0 }]
        }
      ]
    );

    expect(breakdown).toMatchObject({
      castSpellPropertyCostSubtotal: 100,
      finalCost: 20,
      resolvedPropertyCount: 1,
      unresolvedPropertyCount: 0
    });
  });

  it("ignores zero-cost usage limitation properties without cost value tables", () => {
    const breakdown = calculateAuroraItemCostBreakdown(
      {
        baseItemBaseCost: 1,
        baseItemItemMultiplier: 1,
        propertyList: [
          { propertyName: 63, subtype: 1, costTable: 0, costValue: 0 },
          { propertyName: 63, subtype: 9, costTable: 0, costValue: 0 }
        ]
      },
      [
        {
          propertyName: 63,
          cost: 0,
          subtypeOptions: [{ value: 1 }, { value: 9 }],
          costValueOptions: []
        }
      ]
    );

    expect(breakdown).toMatchObject({
      propertyCostSubtotal: 0,
      finalCost: 1,
      resolvedPropertyCount: 0,
      unresolvedPropertyCount: 0
    });
  });

  it("uses Aurora squared melee cost pricing for enhancement-style properties", () => {
    const breakdown = calculateAuroraItemCostBreakdown(
      {
        baseItemBaseCost: 15,
        baseItemItemMultiplier: 2,
        stackSize: 1,
        propertyList: [{ propertyName: 6, costTable: 2, costValue: 1 }]
      },
      [
        {
          propertyName: 6,
          cost: 1,
          costTableDefinition: "iprp_meleecost",
          costValueOptions: [{ value: 1, cost: 0.9 }]
        }
      ]
    );

    expect(breakdown).toMatchObject({
      propertyCostSubtotal: 809,
      preMultiplierSubtotal: 824,
      multipliedSubtotal: 1648,
      finalCost: 1648,
      unresolvedPropertyCount: 0
    });
  });

  it("uses armor.2da base cost and unsuppressed Armor property raw score", () => {
    const breakdown = calculateAuroraItemCostBreakdown(
      {
        baseItem: 16,
        baseItemBaseCost: 15,
        baseItemItemMultiplier: 1,
        stackSize: 1,
        armorParts: { torso: 43 },
        armorPartCostModifiers: { torso: 0 },
        propertyList: [{ propertyName: 1, subtype: 0, costTable: 2, costValue: 5 }]
      },
      [
        {
          propertyName: 1,
          cost: 0.9,
          costTableDefinition: "iprp_meleecost",
          costValueOptions: [{ value: 5, cost: 4.9 }]
        }
      ]
    );

    expect(breakdown).toMatchObject({
      baseCost: 15,
      armorPartCostModifierTotal: 0,
      propertyCostSubtotal: 19448,
      preMultiplierSubtotal: 19463,
      finalCost: 19463,
      unresolvedPropertyCount: 0,
      unresolvedArmorPartCount: 0
    });
  });

  it("rounds stacked property costs after applying StackSize for enchanted ammunition", () => {
    const breakdown = calculateAuroraItemCostBreakdown(
      {
        baseItemBaseCost: 1,
        baseItemItemMultiplier: 0.01,
        stackSize: 99,
        baseItemStacking: 99,
        propertyList: [{ propertyName: 67, costTable: 2, costValue: 2 }]
      },
      [
        {
          propertyName: 67,
          cost: 0.5,
          costTableDefinition: "iprp_meleecost",
          costValueOptions: [{ value: 2, cost: 1.9 }]
        }
      ]
    );

    expect(breakdown).toMatchObject({
      propertyCostSubtotal: 902,
      multipliedSubtotal: 9,
      costStackSize: 99,
      baseArmorStackMultipliedSubtotal: 0,
      propertyStackMultipliedSubtotal: 893,
      stackMultipliedSubtotal: 893,
      finalCost: 893,
      unresolvedPropertyCount: 0
    });
  });

  it("uses Aurora squared subtype and trap-type pricing for trap kits", () => {
    const breakdown = calculateAuroraItemCostBreakdown(
      {
        baseItemBaseCost: 1,
        baseItemItemMultiplier: 1,
        stackSize: 1,
        addCost: 4000,
        propertyList: [{ propertyName: 70, subtype: 3, costTable: 17, costValue: 1 }]
      },
      [
        {
          propertyName: 70,
          cost: 0,
          costTableDefinition: "iprp_trapcost",
          subtypeOptions: [{ value: 3, label: "Deadly", cost: 1.4 }],
          costValueOptions: [{ value: 1, label: "Spike", cost: 0.2 }]
        }
      ]
    );

    expect(breakdown).toMatchObject({
      propertyCostSubtotal: 78,
      preMultiplierSubtotal: 79,
      multipliedSubtotal: 79,
      stackMultipliedSubtotal: 79,
      addCost: 4000,
      finalCost: 4079,
      unresolvedPropertyCount: 0
    });
  });

  it("squares the summed positive property raw score for property-heavy creature items", () => {
    const breakdown = calculateAuroraItemCostBreakdown(
      {
        baseItemItemMultiplier: 1,
        stackSize: 1,
        propertyList: [
          { propertyName: 22, subtype: 2, costTable: 6, costValue: 10 },
          { propertyName: 37, subtype: 8, costTable: 0, costValue: 0 },
          { propertyName: 37, subtype: 9, costTable: 0, costValue: 0 },
          { propertyName: 37, subtype: 4, costTable: 0, costValue: 0 },
          { propertyName: 37, subtype: 1, costTable: 0, costValue: 0 },
          { propertyName: 37, subtype: 2, costTable: 0, costValue: 0 },
          { propertyName: 37, subtype: 7, costTable: 0, costValue: 0 },
          { propertyName: 37, subtype: 3, costTable: 0, costValue: 0 },
          { propertyName: 37, subtype: 0, costTable: 0, costValue: 0 },
          { propertyName: 78, costTable: 23, costValue: 9 }
        ]
      },
      [
        {
          propertyName: 22,
          costTableDefinition: "iprp_soakcost",
          subtypeOptions: [{ value: 2, label: "Bonus+3", cost: 2.25 }],
          costValueOptions: [{ value: 10, label: "Soak50", cost: 8 }]
        },
        {
          propertyName: 37,
          costTableDefinition: "iprp_base1",
          subtypeOptions: [
            { value: 0, label: "Backstab", cost: 8 },
            { value: 1, label: "LvL/Ab_drain", cost: 1.5 },
            { value: 2, label: "MindSpells", cost: 3 },
            { value: 3, label: "Poison", cost: 1 },
            { value: 4, label: "Disease", cost: 1 },
            { value: 7, label: "Paralysis", cost: 3 },
            { value: 8, label: "Critical_Hits", cost: 10 },
            { value: 9, label: "Death_Magic", cost: 3.5 }
          ],
          costValueOptions: []
        },
        {
          propertyName: 78,
          cost: 1.2,
          costTableDefinition: "iprp_spelllvlimm",
          costValueOptions: [{ value: 9, label: "level9", cost: 15 }]
        }
      ]
    );

    expect(breakdown).toMatchObject({
      propertyCostSubtotal: 4489000,
      preMultiplierSubtotal: 4489000,
      multipliedSubtotal: 4489000,
      finalCost: 4489000,
      resolvedPropertyCount: 10,
      unresolvedPropertyCount: 0
    });
  });

  it("uses the Aurora WandCost branch and rejects unsupported spell usage flags", () => {
    const wandBreakdown = calculateAuroraItemCostBreakdown(
      {
        baseItem: 46,
        baseItemBaseCost: 1,
        baseItemItemMultiplier: 1,
        propertyList: [{ propertyName: 15, subtype: 108, costTable: 3, costValue: 2 }]
      },
      [
        {
          propertyName: 15,
          subtypeOptions: [
            {
              value: 108,
              cost: 11250,
              casterLevel: 5,
              innateLevel: 3,
              potionUse: false,
              wandUse: true,
              generalUse: true
            }
          ],
          costValueOptions: [{ value: 2, cost: 0.45, potionCost: 0, wandCost: 1 }]
        }
      ]
    );

    expect(wandBreakdown.castSpellPropertyCostSubtotal).toBe(5062);
    expect(wandBreakdown.finalCost).toBe(5063);

    const unsupportedPotionBreakdown = calculateAuroraItemCostBreakdown(
      {
        baseItem: 49,
        propertyList: [{ propertyName: 15, subtype: 1 }]
      },
      [
        {
          propertyName: 15,
          subtypeOptions: [{ value: 1, casterLevel: 3, innateLevel: 2, potionUse: false }]
        }
      ]
    );

    expect(unsupportedPotionBreakdown.resolvedPropertyCount).toBe(0);
    expect(unsupportedPotionBreakdown.unresolvedPropertyCount).toBe(1);
    expect(unsupportedPotionBreakdown.finalCost).toBe(0);
  });
});
