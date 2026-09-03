import { buildAreaItemPlacementFields } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-item-writer";

describe("Aurora Area ground-Item construction root profile", () => {
  it("keeps blueprint-only, phantom pricing, and Item script fields out of GIT", () => {
    const fields = buildAreaItemPlacementFields({
      templateResRef: "audit_item",
      tag: "AUDIT_ITEM",
      localizedName: "Audit Item",
      comments: "belongs in the paired GIC",
      x: 1,
      y: 2,
      z: 3,
      bearing: 45,
      itemMetadata: {
        baseItem: 16,
        paletteId: 5,
        cost: 11,
        addCost: 13,
        costTable: 17,
        costValue: 19,
        charges: 7,
        "script.onused": "itm_use",
        itemPropertyListEntries: JSON.stringify([{
          propertyName: 15,
          subtype: 66,
          costTable: 3,
          costValue: 1,
          param1: 0xff,
          param1Value: 0,
          chanceAppear: 100,
        }]),
      },
    });

    expect(fields).toEqual(expect.arrayContaining([
      { label: "BaseItem", type: "int", value: 16 },
      { label: "Cost", type: "dword", value: 11 },
      { label: "AddCost", type: "dword", value: 13 },
      { label: "Charges", type: "byte", value: 7 },
    ]));
    expect(fields.map((field) => field.label)).not.toEqual(expect.arrayContaining([
      "PaletteID",
      "Comment",
      "CostTable",
      "CostValue",
      "onused",
    ]));
    expect(fields.find((field) => field.label === "PropertiesList")).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "CostTable", type: "byte", value: 3 },
          { label: "CostValue", type: "word", value: 1 },
        ]),
      })],
    });
  });
});
