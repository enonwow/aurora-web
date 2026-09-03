import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;
const exactScripts: SupportedGffField[] = [
  { label: "OnOpenStore", type: "resref", value: "" },
  { label: "OnStoreClosed", type: "resref", value: "nw_store_close" },
];

describe("Area GIT retained Store script-ResRef parsing", () => {
  it("admits one exact complete type-11 script pair", () => {
    expect(parseAreaObjectsFromGitGff(git(exactScripts))?.stores[0]?.storeMetadata)
      .toEqual({
        scriptResRefs: {
          onOpenStore: "",
          onStoreClosed: "nw_store_close",
        },
      });
  });

  it.each([
    ["missing field", exactScripts.slice(0, -1)],
    ["duplicate field", [...exactScripts, exactScripts[0]!]],
    ["wrong case", exactScripts.map((field) =>
      field.label === "OnOpenStore" ? { ...field, label: "onopenstore" } : field)],
    ["wrong type", exactScripts.map((field) =>
      field.label === "OnStoreClosed"
        ? { label: field.label, type: "cexostring" as const, value: "nw_store_close" }
        : field)],
  ] as const)("keeps %s scripts preserve-only", (_label, fields) => {
    const store = parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))?.stores[0];
    expect(store).toBeDefined();
    expect(store?.storeMetadata).toBeUndefined();
  });

  it("keeps a physically invalid source ResRef preserve-only", () => {
    const bytes = git(exactScripts.map((field) =>
      field.label === "OnOpenStore" ? { ...field, value: "nw_store_open" } : field));
    const offset = bytes.indexOf(Buffer.from("nw_store_open", "ascii"));
    expect(offset).toBeGreaterThan(0);
    bytes[offset + 2] = "-".charCodeAt(0);
    expect(parseAreaObjectsFromGitGff(bytes)?.stores[0]?.storeMetadata).toBeUndefined();
  });

  it("keeps a physically over-length source ResRef preserve-only", () => {
    const bytes = git(exactScripts.map((field) =>
      field.label === "OnOpenStore" ? { ...field, value: "abcdefghijklmnop" } : field));
    const offset = bytes.indexOf(Buffer.from("abcdefghijklmnop", "ascii"));
    expect(offset).toBeGreaterThan(0);
    bytes[offset - 1] = 17;
    expect(parseAreaObjectsFromGitGff(bytes)?.stores[0]?.storeMetadata).toBeUndefined();
  });

  it("merges independently admitted scripts and commerce metadata", () => {
    expect(parseAreaObjectsFromGitGff(git([
      ...exactScripts,
      { label: "MarkUp", type: "int", value: 100 },
      { label: "MarkDown", type: "int", value: 65 },
      { label: "BlackMarket", type: "byte", value: 0 },
      { label: "BM_MarkDown", type: "int", value: 25 },
      { label: "IdentifyPrice", type: "int", value: 100 },
      { label: "MaxBuyPrice", type: "int", value: -1 },
      { label: "StoreGold", type: "int", value: -1 },
    ]))?.stores[0]?.storeMetadata).toEqual({
      scriptResRefs: { onOpenStore: "", onStoreClosed: "nw_store_close" },
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

  it("binds the complete script pair into the GIT dependency fingerprint", () => {
    const first = parseAreaObjectsFromGitGff(git(exactScripts));
    const changed = exactScripts.map((field) =>
      field.label === "OnOpenStore" ? { ...field, value: "nw_store_open" } : field);
    const second = parseAreaObjectsFromGitGff(git(changed));
    expect(second?.dependencyFingerprint).not.toBe(first?.dependencyFingerprint);
  });
});

function git(scriptFields: SupportedGffField[], structTypeId = 11): Buffer {
  return buildGffBuffer([{
    label: "StoreList",
    type: "list",
    value: [{
      typeId: structTypeId,
      fields: [
        { label: "ResRef", type: "resref", value: "x2_merc_dye" },
        { label: "Tag", type: "cexostring", value: "x2_merc_dye" },
        ...scriptFields,
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "XOrientation", type: "float", value: 0 },
        { label: "YOrientation", type: "float", value: -1 },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
