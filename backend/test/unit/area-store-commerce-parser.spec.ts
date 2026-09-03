import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;
const exactCommerce: SupportedGffField[] = [
  { label: "MarkUp", type: "int", value: 100 },
  { label: "MarkDown", type: "int", value: 65 },
  { label: "BlackMarket", type: "byte", value: 0 },
  { label: "BM_MarkDown", type: "int", value: 25 },
  { label: "IdentifyPrice", type: "int", value: 100 },
  { label: "MaxBuyPrice", type: "int", value: -1 },
  { label: "StoreGold", type: "int", value: -1 },
];

describe("Area GIT retained Store commerce parsing", () => {
  it("admits one exact complete type-11 commerce vector", () => {
    expect(parseAreaObjectsFromGitGff(git(exactCommerce))?.stores[0]?.storeMetadata)
      .toEqual({
        commerce: {
          markUp: 100,
          markDown: 65,
          blackMarket: false,
          blackMarketMarkDown: 25,
          identifyPrice: 100,
          maxBuyPrice: -1,
          storeGold: -1,
        },
      });
  });

  it.each([
    ["missing field", exactCommerce.slice(0, -1)],
    ["duplicate field", [...exactCommerce, exactCommerce[0]!]],
    ["wrong case", exactCommerce.map((field) =>
      field.label === "MarkUp" ? { ...field, label: "markup" } : field)],
    ["wrong type", exactCommerce.map((field) =>
      field.label === "StoreGold" ? { label: field.label, type: "dword" as const, value: 1 } : field)],
    ["noncanonical boolean Byte", exactCommerce.map((field) =>
      field.label === "BlackMarket" ? { ...field, value: 2 } : field)],
  ] as const)("keeps %s commerce preserve-only", (_label, fields) => {
    const store = parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))?.stores[0];
    expect(store).toBeDefined();
    expect(store?.storeMetadata).toBeUndefined();
  });

  it("keeps commerce preserve-only for a non-type-11 Store struct", () => {
    const store = parseAreaObjectsFromGitGff(git(exactCommerce, 10))?.stores[0];
    expect(store).toBeDefined();
    expect(store?.storeMetadata).toBeUndefined();
  });

  it("binds the complete commerce vector into the GIT dependency fingerprint", () => {
    const first = parseAreaObjectsFromGitGff(git(exactCommerce));
    const changed = exactCommerce.map((field) =>
      field.label === "StoreGold" ? { ...field, value: 900 } : field);
    const second = parseAreaObjectsFromGitGff(git(changed));
    expect(second?.dependencyFingerprint).not.toBe(first?.dependencyFingerprint);
  });
});

function git(commerceFields: SupportedGffField[], structTypeId = 11): Buffer {
  return buildGffBuffer([{
    label: "StoreList",
    type: "list",
    value: [{
      typeId: structTypeId,
      fields: [
        { label: "ResRef", type: "resref", value: "x2_merc_dye" },
        { label: "Tag", type: "cexostring", value: "x2_merc_dye" },
        ...commerceFields,
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "XOrientation", type: "float", value: 0 },
        { label: "YOrientation", type: "float", value: -1 },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
