import { describe, expect, it } from "vitest";

import {
  areaStoreScriptResRefsValueEqual,
  cloneAreaStoreScriptResRefsValue,
  isAreaStoreScriptResRefsTargetValue,
  isAreaStoreScriptResRefsValue,
  readAreaStoreScriptResRefsValue,
} from "../../../../../src/modules/scene/domain/storeScriptResRefs";

const VALUE = Object.freeze({
  onOpenStore: "",
  onStoreClosed: "nw_store_close",
});

describe("Store script ResRefs domain", () => {
  it("admits and detaches the exact complete source pair", () => {
    expect(isAreaStoreScriptResRefsValue(VALUE)).toBe(true);
    expect(readAreaStoreScriptResRefsValue(VALUE)).toEqual(VALUE);
    const clone = cloneAreaStoreScriptResRefsValue(VALUE);
    expect(clone).toEqual(VALUE);
    expect(clone).not.toBe(VALUE);
    expect(areaStoreScriptResRefsValueEqual(clone, VALUE)).toBe(true);
    expect(areaStoreScriptResRefsValueEqual(
      clone,
      { ...VALUE, onOpenStore: "nw_store_open" },
    )).toBe(false);
  });

  it("keeps uppercase source provenance but requires canonical lowercase targets", () => {
    expect(isAreaStoreScriptResRefsValue({
      onOpenStore: "NW_OPEN",
      onStoreClosed: "NW_CLOSE",
    })).toBe(true);
    expect(isAreaStoreScriptResRefsTargetValue(VALUE)).toBe(true);
    expect(isAreaStoreScriptResRefsTargetValue({
      onOpenStore: "NW_OPEN",
      onStoreClosed: "nw_close",
    })).toBe(false);
  });

  it.each([
    ["missing field", { onOpenStore: "" }],
    ["extra field", { ...VALUE, onBought: "nw_buy" }],
    ["invalid punctuation", { ...VALUE, onOpenStore: "nw-open" }],
    ["over-length", { ...VALUE, onOpenStore: "abcdefghijklmnopq" }],
    ["array", []],
    ["null", null],
  ])("rejects a %s", (_label, candidate) => {
    expect(isAreaStoreScriptResRefsValue(candidate)).toBe(false);
    expect(readAreaStoreScriptResRefsValue(candidate)).toBeUndefined();
  });
});
