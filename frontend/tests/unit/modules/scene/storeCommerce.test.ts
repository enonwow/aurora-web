import { describe, expect, it } from "vitest";

import {
  areaStoreCommerceValueEqual,
  cloneAreaStoreCommerceValue,
  isAreaStoreCommerceValue,
  readAreaStoreCommerceValue,
} from "../../../../src/modules/scene/domain/storeCommerce";

const VALUE = Object.freeze({
  markUp: 100,
  markDown: 65,
  blackMarket: false,
  blackMarketMarkDown: 25,
  identifyPrice: 100,
  maxBuyPrice: -1,
  storeGold: -1,
});

describe("Store commerce domain", () => {
  it("admits and detaches the exact complete signed-int32 vector", () => {
    expect(isAreaStoreCommerceValue(VALUE)).toBe(true);
    expect(readAreaStoreCommerceValue(VALUE)).toEqual(VALUE);
    const clone = cloneAreaStoreCommerceValue(VALUE);
    expect(clone).toEqual(VALUE);
    expect(clone).not.toBe(VALUE);
    expect(areaStoreCommerceValueEqual(clone, VALUE)).toBe(true);
    expect(areaStoreCommerceValueEqual(clone, { ...VALUE, storeGold: 0 })).toBe(false);
  });

  it.each([
    ["missing field", (({ storeGold: _omitted, ...rest }) => rest)(VALUE)],
    ["extra field", { ...VALUE, inventory: 1 }],
    ["fractional int", { ...VALUE, markUp: 1.5 }],
    ["int32 overflow", { ...VALUE, storeGold: 2_147_483_648 }],
    ["non-boolean flag", { ...VALUE, blackMarket: 1 }],
    ["array", []],
    ["null", null],
  ])("rejects a %s", (_label, candidate) => {
    expect(isAreaStoreCommerceValue(candidate)).toBe(false);
    expect(readAreaStoreCommerceValue(candidate)).toBeUndefined();
  });
});
