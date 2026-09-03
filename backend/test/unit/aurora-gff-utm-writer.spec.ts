import {
  serializeStoreBlueprintToUtmGff,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-utm-writer";
import {
  parseRawGffDocument,
  parseTemplateBlueprintFromGff,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";

describe("aurora-gff-utm-writer", () => {
  it("materializes the complete reciprocal native UTM writer profile and defaults", () => {
    const bytes = serializeStoreBlueprintToUtmGff({
      resRef: "custom_store",
      localizedName: "Custom Store",
      tag: "CUSTOM_STORE",
    });

    const document = parseRawGffDocument(bytes);
    expect(document).not.toBeNull();
    expect(document?.fileType).toBe("UTM ");
    expect(document?.fileVersion).toBe("V3.2");
    expect(document?.rootStructTypeId).toBe(0xffffffff);
    expect(document?.fields.map((field) => [field.label, field.type])).toEqual([
      ["ResRef", "resref"],
      ["LocName", "cexolocstring"],
      ["Tag", "cexostring"],
      ["MarkUp", "int"],
      ["MarkDown", "int"],
      ["BlackMarket", "byte"],
      ["BM_MarkDown", "int"],
      ["IdentifyPrice", "int"],
      ["MaxBuyPrice", "int"],
      ["StoreGold", "int"],
      ["OnOpenStore", "resref"],
      ["OnStoreClosed", "resref"],
      ["WillNotBuy", "list"],
      ["WillOnlyBuy", "list"],
      ["StoreList", "list"],
      ["ID", "byte"],
      ["Comment", "cexostring"],
    ]);
    expect(document?.fields.slice(3, 10).map((field) => field.value)).toEqual([
      0, 0, 0, 0, 100, -1, -1,
    ]);
    expect(document?.fields.find((field) => field.label === "OnOpenStore")?.value).toBe("");
    expect(document?.fields.find((field) => field.label === "OnStoreClosed")?.value).toBe("");
    expect(document?.fields.find((field) => field.label === "ID")?.value).toBe(0xff);
    expect(document?.fields.find((field) => field.label === "Comment")?.value).toBe("");
    const storeList = document?.fields.find((field) => field.label === "StoreList");
    expect(storeList?.type).toBe("list");
    expect(storeList?.type === "list" ? storeList.value.map((bucket) => bucket.typeId) : []).toEqual([
      0, 4, 2, 3, 1,
    ]);
  });

  it("round-trips the complete signed commerce and script profile", () => {
    const bytes = serializeStoreBlueprintToUtmGff({
      resRef: "signed_store",
      localizedName: "Signed Store",
      tag: "SIGNED_STORE",
      comments: "native comment",
      markUp: -10,
      markDown: 35,
      blackMarket: true,
      bmMarkDown: -25,
      identifyPrice: 150,
      maxBuyPrice: -1,
      storeGold: 2_000_000,
      onOpenStore: "on_store_open",
      onStoreClosed: "on_store_close",
      storeId: 7,
      willNotBuyBaseItems: [16],
      willOnlyBuyBaseItems: [22],
    });

    expect(parseTemplateBlueprintFromGff(bytes)).toMatchObject({
      templateResRef: "signed_store",
      localizedName: "Signed Store",
      tag: "SIGNED_STORE",
      comments: "native comment",
      markUp: -10,
      markDown: 35,
      blackMarket: true,
      bmMarkDown: -25,
      identifyPrice: 150,
      maxBuyPrice: -1,
      storeGold: 2_000_000,
      onOpenStore: "on_store_open",
      onStoreClosed: "on_store_close",
      storeId: 7,
      willNotBuyBaseItems: [16],
      willOnlyBuyBaseItems: [22],
    });
  });
});
