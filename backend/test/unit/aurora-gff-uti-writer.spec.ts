import {
  parseRawGffDocument,
  parseTemplateBlueprintFromGff,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  serializeItemBlueprintToUtiGff,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

describe("Aurora GFF writer CExoLocString preservation", () => {
  it("preserves explicit empty localized entries instead of collapsing them to no entries", () => {
    const parsed = parseRawGffDocument(
      buildGffBuffer(
        [
          {
            label: "Mod_Description",
            type: "cexolocstring",
            value: {
              strRef: 0xffffffff,
              entries: [
                { languageId: 10, text: "" },
                { languageId: 0, text: "Visible" }
              ]
            }
          }
        ],
        "IFO ",
        0xffffffff
      )
    );

    expect(parsed?.fields).toEqual([
      {
        label: "Mod_Description",
        type: "cexolocstring",
        value: {
          strRef: 0xffffffff,
          entries: [
            { languageId: 10, text: "" },
            { languageId: 0, text: "Visible" }
          ]
        }
      }
    ]);
  });
});

describe("Aurora native Item root serialization", () => {
  it("omits phantom root pricing and script fields while preserving native property costs", () => {
    const forged = {
      templateResRef: "audit_item",
      localizedName: "Audit Item",
      tag: "AUDIT_ITEM",
      baseItem: 16,
      charges: 7,
      cost: 11,
      addCost: 13,
      costTable: 17,
      costValue: 19,
      scripts: { onused: "itm_use" },
      itemPropertyListEntries: [{
        propertyName: 15,
        subtype: 66,
        costTable: 3,
        costValue: 1,
        param1: 0xff,
        param1Value: 0,
        chanceAppear: 100,
      }],
    } as unknown as Parameters<typeof serializeItemBlueprintToUtiGff>[0];

    const parsed = parseRawGffDocument(serializeItemBlueprintToUtiGff(forged));
    const root = parsed?.fields ?? [];
    expect(root).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "LocalizedName", type: "cexolocstring" }),
      { label: "BaseItem", type: "int", value: 16 },
      { label: "Charges", type: "byte", value: 7 },
      { label: "Cost", type: "dword", value: 11 },
      { label: "AddCost", type: "dword", value: 13 },
    ]));
    expect(root.map((field) => field.label)).not.toEqual(expect.arrayContaining([
      "LocName",
      "CostTable",
      "CostValue",
      "OnUsed",
      "onused",
    ]));

    const propertyList = root.find((field) => field.label === "PropertiesList");
    expect(propertyList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "CostTable", type: "byte", value: 3 },
          { label: "CostValue", type: "word", value: 1 },
        ]),
      })],
    });
  });

  it("serializes the native ordered Item VarTable without normalizing names or duplicates", () => {
    const parsed = parseRawGffDocument(serializeItemBlueprintToUtiGff({
      templateResRef: "audit_vars",
      localizedName: "Audit Variables",
      tag: "AUDIT_VARS",
      baseItem: 16,
      variableListEntries: [
        { name: " duplicate ", type: "int", value: -7 },
        { name: "duplicate", type: "float", value: Math.fround(1.25) },
        { name: "duplicate", type: "string", value: " exact value " },
      ],
    } as Parameters<typeof serializeItemBlueprintToUtiGff>[0]));

    expect(parsed?.fields.find((field) => field.label === "VarTable")).toEqual({
      label: "VarTable",
      type: "list",
      value: [
        {
          typeId: 0,
          fields: [
            { label: "Name", type: "cexostring", value: " duplicate " },
            { label: "Type", type: "int", value: 1 },
            { label: "Value", type: "int", value: -7 },
          ],
        },
        {
          typeId: 0,
          fields: [
            { label: "Name", type: "cexostring", value: "duplicate" },
            { label: "Type", type: "int", value: 2 },
            { label: "Value", type: "float", value: 1.25 },
          ],
        },
        {
          typeId: 0,
          fields: [
            { label: "Name", type: "cexostring", value: "duplicate" },
            { label: "Type", type: "int", value: 3 },
            { label: "Value", type: "cexostring", value: " exact value " },
          ],
        },
      ],
    });
  });

  it("omits an empty native Item VarTable", () => {
    const parsed = parseRawGffDocument(serializeItemBlueprintToUtiGff({
      templateResRef: "audit_empty_vars",
      localizedName: "Audit Empty Variables",
      tag: "AUDIT_EMPTY_VARIABLES",
      baseItem: 16,
      variableListEntries: [],
    } as Parameters<typeof serializeItemBlueprintToUtiGff>[0]));

    expect(parsed?.fields.map((field) => field.label)).not.toContain("VarTable");
  });

  it("serializes canonical reference-form ItemList and Equip_ItemList", () => {
    const bytes = serializeItemBlueprintToUtiGff({
      templateResRef: "nested_bag",
      localizedName: "Nested Bag",
      tag: "NESTED_BAG",
      baseItem: 16,
      inventoryItemListEntries: [
        { resRef: "itm_potion", x: 3, y: 4 },
        { resRef: "itm_scroll", x: 5, y: 6 },
      ],
      equipItemListEntries: [
        { resRef: "itm_ring", slotMask: 0x4 },
        { resRef: "itm_cloak", slotMask: 0x2000 },
      ],
    } as Parameters<typeof serializeItemBlueprintToUtiGff>[0]);
    const parsed = parseRawGffDocument(bytes);

    expect(parsed?.fields.find((field) => field.label === "ItemList")).toEqual({
      label: "ItemList",
      type: "list",
      value: [
        {
          typeId: 0,
          fields: [
            { label: "InventoryRes", type: "resref", value: "itm_potion" },
            { label: "Repos_PosX", type: "word", value: 3 },
            { label: "Repos_Posy", type: "word", value: 4 },
          ],
        },
        {
          typeId: 1,
          fields: [
            { label: "InventoryRes", type: "resref", value: "itm_scroll" },
            { label: "Repos_PosX", type: "word", value: 5 },
            { label: "Repos_Posy", type: "word", value: 6 },
          ],
        },
      ],
    });
    expect(parsed?.fields.find((field) => field.label === "Equip_ItemList")).toEqual({
      label: "Equip_ItemList",
      type: "list",
      value: [
        {
          typeId: 0x4,
          fields: [{ label: "EquippedRes", type: "resref", value: "itm_ring" }],
        },
        {
          typeId: 0x2000,
          fields: [{ label: "EquippedRes", type: "resref", value: "itm_cloak" }],
        },
      ],
    });
    expect(parseTemplateBlueprintFromGff(bytes)).toMatchObject({
      inventoryItemListEntries: [
        { resRef: "itm_potion", x: 3, y: 4 },
        { resRef: "itm_scroll", x: 5, y: 6 },
      ],
      equipItemListEntries: [
        { resRef: "itm_ring", slotMask: 0x4 },
        { resRef: "itm_cloak", slotMask: 0x2000 },
      ],
    });
  });

  it("omits empty Item blueprint inventory and equipment lists", () => {
    const parsed = parseRawGffDocument(serializeItemBlueprintToUtiGff({
      templateResRef: "empty_bag",
      localizedName: "Empty Bag",
      tag: "EMPTY_BAG",
      baseItem: 16,
      inventoryItemListEntries: [],
      equipItemListEntries: [],
    } as Parameters<typeof serializeItemBlueprintToUtiGff>[0]));
    expect(parsed?.fields.map((field) => field.label)).not.toEqual(expect.arrayContaining([
      "ItemList",
      "Equip_ItemList",
    ]));
  });
});
