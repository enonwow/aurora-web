import {
  AREA_STORE_SCRIPT_RESREF_FIELDS,
  areaStoreScriptResRefsValueEqual,
  cloneAreaStoreScriptResRefsValue,
  readAreaStoreScriptResRefsMutation,
  readAreaStoreScriptResRefsValue,
} from "../../src/modules/areas/domain/area-store-script-resrefs";

const scripts = Object.freeze({
  onOpenStore: "",
  onStoreClosed: "nw_store_close",
});

describe("existing Area Store script ResRefs", () => {
  it("freezes the exact two-field native profile", () => {
    expect(AREA_STORE_SCRIPT_RESREF_FIELDS).toEqual([
      { key: "onOpenStore", label: "OnOpenStore" },
      { key: "onStoreClosed", label: "OnStoreClosed" },
    ]);
    expect(Object.isFrozen(AREA_STORE_SCRIPT_RESREF_FIELDS)).toBe(true);
    expect(AREA_STORE_SCRIPT_RESREF_FIELDS.every(Object.isFrozen)).toBe(true);
  });

  it("admits and detaches a complete exact source pair", () => {
    const admitted = readAreaStoreScriptResRefsValue(scripts);
    expect(admitted).toEqual(scripts);
    expect(Object.isFrozen(admitted)).toBe(true);
    const cloned = cloneAreaStoreScriptResRefsValue(admitted!);
    expect(cloned).toEqual(admitted);
    expect(cloned).not.toBe(admitted);
    expect(areaStoreScriptResRefsValueEqual(cloned, admitted!)).toBe(true);
  });

  it.each([
    ["partial", { onOpenStore: "nw_open" }],
    ["extra", { ...scripts, onBought: "nw_buy" }],
    ["non-string", { ...scripts, onOpenStore: 1 }],
    ["invalid punctuation", { ...scripts, onOpenStore: "nw-open" }],
    ["over-length", { ...scripts, onOpenStore: "abcdefghijklmnopq" }],
  ])("rejects a %s source pair", (_label, value) => {
    expect(readAreaStoreScriptResRefsValue(value)).toBeNull();
  });

  it("admits uppercase source provenance but requires lowercase targets", () => {
    expect(readAreaStoreScriptResRefsValue({
      onOpenStore: "NW_OPEN",
      onStoreClosed: "NW_CLOSE",
    })).not.toBeNull();
    expect(readAreaStoreScriptResRefsMutation({
      expectedValue: { onOpenStore: "NW_OPEN", onStoreClosed: "NW_CLOSE" },
      value: { onOpenStore: "nw_open", onStoreClosed: "nw_close" },
    })).not.toBeNull();
    expect(readAreaStoreScriptResRefsMutation({
      expectedValue: scripts,
      value: { ...scripts, onOpenStore: "NW_OPEN" },
    })).toBeNull();
  });

  it("admits a complete changed pair CAS and rejects no-op or loose shapes", () => {
    expect(readAreaStoreScriptResRefsMutation({
      expectedValue: scripts,
      value: { ...scripts, onOpenStore: "nw_store_open" },
    })).toEqual({
      expectedValue: scripts,
      value: { ...scripts, onOpenStore: "nw_store_open" },
    });
    expect(readAreaStoreScriptResRefsMutation({
      expectedValue: scripts,
      value: scripts,
    })).toBeNull();
    expect(readAreaStoreScriptResRefsMutation({
      expectedValue: scripts,
      value: { ...scripts, onOpenStore: "nw_store_open" },
      alias: true,
    })).toBeNull();
  });
});
