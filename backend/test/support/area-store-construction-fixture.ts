import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import type { SupportedGffField } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";

const DYE_RESREFS = Object.freeze([
  "x2_it_dyec23", "x2_it_dyec00", "x2_it_dyec25", "x2_it_dyec02", "x2_it_dyec48",
  "x2_it_dyec44", "x2_it_dyec35", "x2_it_dyec37", "x2_it_dyec29", "x2_it_dyec33",
  "x2_it_dyec26", "x2_it_dyec31", "x2_it_dyec20", "x2_it_dyec34", "x2_it_dyec36",
  "x2_it_dyec28", "x2_it_dyec39", "x2_it_dyec41", "x2_it_dyec32", "x2_it_dyel23",
  "x2_it_dyel00", "x2_it_dyel25", "x2_it_dyel02", "x2_it_dyel48", "x2_it_dyel44",
  "x2_it_dyel35", "x2_it_dyel37", "x2_it_dyel29", "x2_it_dyel33", "x2_it_dyel26",
  "x2_it_dyel31", "x2_it_dyel20", "x2_it_dyel34", "x2_it_dyel36", "x2_it_dyel28",
  "x2_it_dyel39", "x2_it_dyel41", "x2_it_dyel32", "x2_it_dyem03", "x2_it_dyem00",
  "x2_it_dyem31", "x2_it_dyem16", "x2_it_dyem40", "x2_it_dyem28", "x2_it_dyem24",
  "x2_it_dyem32", "x2_it_dyem18", "x2_it_dyem10", "x2_it_dyem42", "x2_it_dyem02",
  "x2_it_dyem25", "x2_it_dyem37", "x2_it_dyem08", "x2_it_dyem36", "x2_it_dyem48",
] as const);

const EXACT_X2_MERC_DYE_UTM_DEFLATE_BASE64 =
  "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";

const EXACT_DYE_UTI_BUNDLE_DEFLATE_BASE64 =
  "7d3ZbxtVFMfxX0hKKWkobSmlrH3hFXlrm74RUiQipShK0ooHpGpi37YW40X2RCJ9Kvu+7/sOZS1l53/hL2D9E0Lu3OvYkdKHI1oEytdS5Bnbc8e2Tj46M/fM" +
  "8ZH5qb1Hy7eUxiUNS7pb0t6V+1+GpD2S0mHpdknnVp48vXJfHJG2SlpeXl6WpB0KtzskbY7Ltbg8qv5tk6QhSdcobH+JpLG47Pe7Jy6PSLpZ0uVxm2Lc/tK4" +
  "PhLHLsXHL4v3frwtcR+K2yu+fjR+JsV99F4zNvD+rpB0l6Rt8a835pVx3S9vl/Rr3HhHfN/+8Z3x/fnbVf67icu7Bsa/On4v64352z8c0992S7o1fm7/HU9I" +
  "mneNdppkbtZ1Z91x6bak66Yy1+htP92qJmn9lKvdmTScpEOuW+3U21m91cyf9+tTNdfM6sfrribNJyc0eJs8mXROuG5/vdXNBp+fy1qpaw6uJ9V75uqnXFyf" +
  "SVtrXj9Rq60ZYnDf+fiLnW5v2d8Ot2ounUk6WQySmU6r7TpZ3XWn636YuL4UP57mFheypbZb837nk4XUDawfTdLF1feXdJJGsb+/sN5/xeTJpFl1E+22Szrh" +
  "+dRlmZs6tDpeo+Ga/c+z9d7SsXp2rLbkqqWyD9wHF4ZWg7j3D+WX74uP+2Bd3WayVO4NNBSDZDgG+KYYLJvj9ltiIIzGMcZigPugu1HSTTEIt8eg2xmDbFcM" +
  "qt0xiPw/5bWSrpN0vaQb4n57+z8CHuABHv82HoWCD9zTJjwKBfAAD/Ag89jnA/chW+axDzzAAzzIPEo+cO+3ZR4l8AAP8NjweFTGfeC+YMKjMg4e4AEe4FHx" +
  "gfu8DY8KeIAHeGx4PMr5OY+nTHiUOecBHuABHuUDPnCfseFxADzAAzyYbTnoA/dR22zLQfAAD/Ag88iLxJ6wZR4UiYEHeIBHab8P3Idtmcd+8AAP8CDzKPrA" +
  "fcyWeRTBAzzAg8wjL09/wJZ5UJ4OHuABHuW8zuNJW+ZBnQd4gAd4lPNzHk/b8OCcB3iAB3iU8vL0R2yHLZSngwd4gEc5r/N41pZ5UOcBHuABHpV8tuU527Ut" +
  "zLaAB3iARzm/JP9xW+bBJfn/czx+vwh4/AEeGwyPNLQhfPU8eLy0Hh7TtCEED/AAjzS0IXzRhAdtCMEDPMAjDW0IX7NlHlySDx7gAR6hDeHLtsyDcx7gAR7g" +
  "EdoQfmLCgzaE4AEe4JGGNoQf2/CgPB08wAM8QhvC90x40IYQPMADPNLQhvADGx60IQQP8ACP0IbwTdtsC+Xp4AEe4BHaEL5jyzwoEgMP8ACP0IbwdVvmwSX5" +
  "4AEe4BHaEL5lyzy4MA48wAM8QhvCV2yZB+Xp4AEe4BHaEL5ryzyo8wAP8ACP0IbwfRsenPMAD/AAj9CG8A3bYQvl6eABHuAR2hB+aMs8qPMAD/AAj9CG8CPb" +
  "tS3MtoAHeIBHaEP4ti3z4JL8C4RHzYjH7AXC48+LgMdf4LHB8GgU8grTz8+Dx6fr4XG4QIUpeIAHeIQ2hGdseFDnAR7gAR6hwvRbEx5UmIIHeIBHo5jXeXxl" +
  "wqNInQd4gAd4VPLDlh9NeFQ4bAEP8ACPUCT2jQkPisTAAzzAo1HKr2352oYH17aAB3iAR6jz+M52wpQ6D/AAD/Ao5octZ20nTDlsAQ/wAI9ifsL0SxsenDAF" +
  "D/AAj0p+2PKTbbaFwxbwAA/wCD83+ZmtwhQ8wAM8wCP80PU522wLP/oEHuABHuFHn36wzbbwo0/gAR7gUchnW76wHbYw2wIe4AEeoYfp97bMg2tbwAM8wKOS" +
  "Zx4/22Zb/nOZx98=";

export function storeBlueprintFixture(): Buffer {
  return inflateRawSync(Buffer.from(EXACT_X2_MERC_DYE_UTM_DEFLATE_BASE64, "base64"));
}

export function storeAdditionFixture(
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }> = {
    x: 4.291445541381836,
    y: 5.039402770996094,
    z: 0.00000005,
    bearing: Math.PI * 1.5,
  },
) {
  const blueprintBytes = storeBlueprintFixture();
  return {
    kind: "store" as const,
    localObjectId: "sto_001",
    sourceProfileId: "nwn-base-key-utm-x2-merc-dye-v1",
    templateResRef: "x2_merc_dye",
    resRef: "x2_merc_dye",
    tag: "x2_merc_dye",
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    blueprintBytes,
    blueprintDependencies: storeBlueprintDependencyFixtures(),
    ...transform,
  };
}

export function storeBlueprintDependencyFixtures() {
  const bundle = inflateRawSync(Buffer.from(EXACT_DYE_UTI_BUNDLE_DEFLATE_BASE64, "base64"));
  if (bundle.length !== DYE_RESREFS.length * 1085) {
    throw new Error("Invalid exact dye UTI fixture bundle.");
  }
  return DYE_RESREFS.map((templateResRef, index) => {
    const bytes = Buffer.from(bundle.subarray(index * 1085, (index + 1) * 1085));
    return Object.freeze({
      templateResRef,
      resourceType: 2025,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes,
    });
  });
}

export function expectedStoreGitFields(
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }>,
): SupportedGffField[] {
  const sourceFields = storeBlueprintFields();
  const inventory = sourceFields[14];
  if (inventory?.type !== "list") throw new Error("invalid store fixture inventory");
  const itemList = inventory.value[4]?.fields[0];
  if (itemList?.type !== "list") throw new Error("invalid store fixture item list");
  const dependencies = storeBlueprintDependencyFixtures();
  const expandedItems = itemList.value.map((repositoryEntry, index) => {
    const dependency = parseRawGffDocument(dependencies[index]!.bytes);
    if (!dependency) throw new Error("invalid store fixture dependency");
    const modelPart = dependency.fields[14];
    if (modelPart?.type !== "byte") throw new Error("invalid store fixture ModelPart1");
    return {
      typeId: repositoryEntry.typeId,
      fields: [
        { label: "XPosition", type: "float" as const, value: -1 },
        { label: "YPosition", type: "float" as const, value: -1 },
        { label: "ZPosition", type: "float" as const, value: -1 },
        { label: "XOrientation", type: "float" as const, value: 0 },
        { label: "YOrientation", type: "float" as const, value: 1 },
        ...dependency.fields.slice(0, 15),
        { label: "xModelPart1", type: "word" as const, value: modelPart.value },
        dependency.fields[15]!,
        ...repositoryEntry.fields.slice(1),
      ],
    };
  });
  const expandedInventory: SupportedGffField = {
    label: "StoreList",
    type: "list",
    value: inventory.value.map((bucket, index) => index === 4
      ? { typeId: bucket.typeId, fields: [{ label: "ItemList", type: "list", value: expandedItems }] }
      : bucket),
  };
  return [
    { label: "XPosition", type: "float", value: Math.fround(transform.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(transform.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(transform.z * 10) },
    { label: "XOrientation", type: "float", value: Math.abs(Math.fround(Math.cos(transform.bearing))) < Math.fround(1e-6) ? 0 : Math.fround(Math.cos(transform.bearing)) },
    { label: "YOrientation", type: "float", value: Math.abs(Math.fround(Math.sin(transform.bearing))) < Math.fround(1e-6) ? 0 : Math.fround(-Math.sin(transform.bearing)) },
    ...sourceFields.slice(0, 14),
    expandedInventory,
  ];
}

export function storeBlueprintFields(): SupportedGffField[] {
  const items = DYE_RESREFS.map((resref, index) => ({
    typeId: index,
    fields: [
      { label: "InventoryRes", type: "resref" as const, value: resref },
      { label: "Repos_PosX", type: "word" as const, value: index % 10 },
      { label: "Repos_Posy", type: "word" as const, value: Math.floor(index / 10) },
      ...(index === 33 || index === 54
        ? []
        : [{ label: "Infinite", type: "byte" as const, value: 1 }]),
    ],
  }));
  return [
    { label: "ResRef", type: "resref", value: "x2_merc_dye" },
    { label: "LocName", type: "cexolocstring", value: { strRef: 91377, entries: [] } },
    { label: "Tag", type: "cexostring", value: "x2_merc_dye" },
    { label: "MarkUp", type: "int", value: 100 },
    { label: "MarkDown", type: "int", value: 65 },
    { label: "BlackMarket", type: "byte", value: 0 },
    { label: "BM_MarkDown", type: "int", value: 25 },
    { label: "IdentifyPrice", type: "int", value: 100 },
    { label: "MaxBuyPrice", type: "int", value: -1 },
    { label: "StoreGold", type: "int", value: -1 },
    { label: "OnOpenStore", type: "resref", value: "" },
    { label: "OnStoreClosed", type: "resref", value: "" },
    { label: "WillNotBuy", type: "list", value: [] },
    { label: "WillOnlyBuy", type: "list", value: [] },
    { label: "StoreList", type: "list", value: [
      { typeId: 0, fields: [] },
      { typeId: 4, fields: [] },
      { typeId: 2, fields: [] },
      { typeId: 3, fields: [] },
      { typeId: 1, fields: [{ label: "ItemList", type: "list", value: items }] },
    ] },
    { label: "ID", type: "byte", value: 5 },
    { label: "Comment", type: "cexostring", value: "Sample Dye Store" },
  ];
}
