import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT retained Store inventory parsing", () => {
  it("publishes all five canonical buckets, coordinates, identities, and Infinite state", () => {
    expect(parseAreaObjectsFromGitGff(git([storeInventory()]))?.stores[0]
      ?.storeInventoryRaw).toEqual({
      buckets: [
        {
          bucketTypeId: 0,
          entries: [
            { sourceIndex: 0, resRef: "itm_a", baseItemId: 0, x: 0, y: 0, infinite: true },
            { sourceIndex: 1, resRef: "itm_b", baseItemId: 1, x: 2, y: 0, infinite: false },
          ],
        },
        { bucketTypeId: 4, entries: [] },
        { bucketTypeId: 2, entries: [] },
        { bucketTypeId: 3, entries: [] },
        { bucketTypeId: 1, entries: [] },
      ],
    });
  });

  it.each([
    ["missing StoreList", []],
    ["duplicate StoreList", [storeInventory(), storeInventory()]],
    ["wrong bucket order", [inventoryWith((list) => {
      [list.value[0], list.value[1]] = [list.value[1]!, list.value[0]!];
    })]],
    ["non-empty bucket sibling", [inventoryWith((list) => {
      list.value[1]!.fields.push({ label: "Drift", type: "byte", value: 1 });
    })]],
    ["empty ItemList", [inventoryWith((list) => {
      const field = list.value[0]!.fields[0];
      if (field?.type === "list") field.value = [];
    })]],
    ["wrong child ordinal", [inventoryWith((list) => {
      const field = list.value[0]!.fields[0];
      if (field?.type === "list") field.value[1]!.typeId = 7;
    })]],
    ["duplicate TemplateResRef", [inventoryWith((list) => {
      item(list, 0).fields.push({ label: "TemplateResRef", type: "resref", value: "itm_a" });
    })]],
    ["wrong BaseItem type", [inventoryWith((list) => {
      item(list, 0).fields[1] = { label: "BaseItem", type: "dword", value: 0 };
    })]],
    ["wrong coordinate spelling", [inventoryWith((list) => {
      item(list, 0).fields[3] = { label: "Repos_PosY", type: "word", value: 0 };
    })]],
    ["explicit false Infinite", [inventoryWith((list) => {
      item(list, 0).fields[4] = { label: "Infinite", type: "byte", value: 0 };
    })]],
    ["opaque field after native coordinate tail", [inventoryWith((list) => {
      item(list, 1).fields.push({ label: "OpaqueAfterTail", type: "int", value: 1 });
    })]],
    ["mode-0 flag", [inventoryWith((list) => {
      item(list, 0).fields.push({ label: "Dropable", type: "byte", value: 1 });
    })]],
  ] as const)("keeps %s preserve-only", (_label, storeFields) => {
    expect(parseAreaObjectsFromGitGff(git(storeFields as SupportedGffField[]))
      ?.stores[0]?.storeInventoryRaw).toBeUndefined();
  });

  it("binds exact inventory semantics into the dependency fingerprint", () => {
    const first = parseAreaObjectsFromGitGff(git([storeInventory()]));
    const changed = inventoryWith((list) => {
      const infinite = item(list, 0).fields[4];
      if (infinite?.type === "byte") infinite.value = 1;
      item(list, 1).fields.push({ label: "Infinite", type: "byte", value: 1 });
    });
    expect(parseAreaObjectsFromGitGff(git([changed]))?.dependencyFingerprint)
      .not.toBe(first?.dependencyFingerprint);
  });
});

function storeInventory(): Extract<SupportedGffField, { type: "list" }> {
  return {
    label: "StoreList",
    type: "list",
    value: [
      {
        typeId: 0,
        fields: [{
          label: "ItemList",
          type: "list",
          value: [
            embedded(0, "itm_a", 0, 0, 0, true),
            embedded(1, "itm_b", 1, 2, 0, false),
          ],
        }],
      },
      { typeId: 4, fields: [] },
      { typeId: 2, fields: [] },
      { typeId: 3, fields: [] },
      { typeId: 1, fields: [] },
    ],
  };
}

function embedded(
  typeId: number,
  resRef: string,
  baseItemId: number,
  x: number,
  y: number,
  infinite: boolean,
) {
  return {
    typeId,
    fields: [
      { label: "TemplateResRef", type: "resref" as const, value: resRef },
      { label: "BaseItem", type: "int" as const, value: baseItemId },
      { label: "Repos_PosX", type: "word" as const, value: x },
      { label: "Repos_Posy", type: "word" as const, value: y },
      ...(infinite ? [{ label: "Infinite", type: "byte" as const, value: 1 }] : []),
    ],
  };
}

function inventoryWith(
  mutate: (list: Extract<SupportedGffField, { type: "list" }>) => void,
) {
  const list = structuredClone(storeInventory());
  mutate(list);
  return list;
}

function item(
  list: Extract<SupportedGffField, { type: "list" }>,
  index: number,
) {
  const itemList = list.value[0]!.fields[0];
  if (itemList?.type !== "list") throw new Error("invalid fixture");
  return itemList.value[index]!;
}

function git(storeFields: SupportedGffField[]): Buffer {
  return buildGffBuffer([{
    label: "StoreList",
    type: "list",
    value: [{
      typeId: 11,
      fields: [
        { label: "ResRef", type: "resref", value: "x2_merc_dye" },
        { label: "Tag", type: "cexostring", value: "x2_merc_dye" },
        ...storeFields,
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "XOrientation", type: "float", value: 0 },
        { label: "YOrientation", type: "float", value: -1 },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
