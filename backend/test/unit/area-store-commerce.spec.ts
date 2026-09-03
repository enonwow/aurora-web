import {
  AREA_STORE_COMMERCE_FIELDS,
  areaStoreCommerceValueEqual,
  cloneAreaStoreCommerceValue,
  readAreaStoreCommerceMutation,
  readAreaStoreCommerceValue,
} from "../../src/modules/areas/domain/area-store-commerce";

const commerce = Object.freeze({
  markUp: 100,
  markDown: 65,
  blackMarket: false,
  blackMarketMarkDown: 25,
  identifyPrice: 100,
  maxBuyPrice: -1,
  storeGold: -1,
});

describe("existing Area Store commerce vector", () => {
  it("freezes the exact seven-field native profile", () => {
    expect(AREA_STORE_COMMERCE_FIELDS).toEqual([
      { key: "markUp", label: "MarkUp", nativeType: "int" },
      { key: "markDown", label: "MarkDown", nativeType: "int" },
      { key: "blackMarket", label: "BlackMarket", nativeType: "byte" },
      { key: "blackMarketMarkDown", label: "BM_MarkDown", nativeType: "int" },
      { key: "identifyPrice", label: "IdentifyPrice", nativeType: "int" },
      { key: "maxBuyPrice", label: "MaxBuyPrice", nativeType: "int" },
      { key: "storeGold", label: "StoreGold", nativeType: "int" },
    ]);
    expect(Object.isFrozen(AREA_STORE_COMMERCE_FIELDS)).toBe(true);
  });

  it("admits and clones a complete exact signed-int32/boolean vector", () => {
    const admitted = readAreaStoreCommerceValue({
      ...commerce,
      markUp: -2_147_483_648,
      storeGold: 2_147_483_647,
    });
    expect(admitted).toEqual({
      ...commerce,
      markUp: -2_147_483_648,
      storeGold: 2_147_483_647,
    });
    expect(Object.isFrozen(admitted)).toBe(true);
    const cloned = cloneAreaStoreCommerceValue(admitted!);
    expect(cloned).toEqual(admitted);
    expect(cloned).not.toBe(admitted);
    expect(areaStoreCommerceValueEqual(cloned, admitted!)).toBe(true);
  });

  it.each([
    ["partial", { ...commerce, storeGold: undefined }],
    ["extra", { ...commerce, inventory: [] }],
    ["non-integer", { ...commerce, markUp: 1.5 }],
    ["below int32", { ...commerce, maxBuyPrice: -2_147_483_649 }],
    ["above int32", { ...commerce, storeGold: 2_147_483_648 }],
    ["numeric boolean", { ...commerce, blackMarket: 1 }],
  ])("rejects a %s vector", (_label, value) => {
    expect(readAreaStoreCommerceValue(value)).toBeNull();
  });

  it("admits a complete changed vector CAS and rejects no-op or loose shapes", () => {
    expect(readAreaStoreCommerceMutation({
      expectedValue: commerce,
      value: { ...commerce, storeGold: 1234 },
    })).toEqual({
      expectedValue: commerce,
      value: { ...commerce, storeGold: 1234 },
    });
    expect(readAreaStoreCommerceMutation({
      expectedValue: commerce,
      value: commerce,
    })).toBeNull();
    expect(readAreaStoreCommerceMutation({
      expectedValue: commerce,
      value: { ...commerce, storeGold: 1234 },
      alias: true,
    })).toBeNull();
  });
});
