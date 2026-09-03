import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;
const ENTRY_TYPE = 0x0001_7e4d;

const exactRestrictions: SupportedGffField[] = [
  {
    label: "WillNotBuy",
    type: "list",
    value: [2, 1, 2].map((baseItemId) => ({
      typeId: ENTRY_TYPE,
      fields: [{ label: "BaseItem", type: "int" as const, value: baseItemId }],
    })),
  },
  {
    label: "WillOnlyBuy",
    type: "list",
    value: [{
      typeId: ENTRY_TYPE,
      fields: [{ label: "BaseItem", type: "int", value: 0 }],
    }],
  },
];

describe("Area GIT retained Store restriction parsing", () => {
  it("retains exact physical absence for both semantic-empty vectors", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.stores[0]?.storeRestrictionsRaw)
      .toEqual({
        willNotBuy: { present: false },
        willOnlyBuy: { present: false },
      });
  });

  it("admits both exact ordered duplicate-preserving native lists", () => {
    expect(parseAreaObjectsFromGitGff(git(exactRestrictions))?.stores[0]
      ?.storeRestrictionsRaw).toEqual({
      willNotBuy: {
        present: true,
        nativeType: "list",
        entryStructTypeId: ENTRY_TYPE,
        baseItemNativeType: "int",
        baseItemIds: [2, 1, 2],
        opaqueSiblingFieldCounts: [0, 0, 0],
      },
      willOnlyBuy: {
        present: true,
        nativeType: "list",
        entryStructTypeId: ENTRY_TYPE,
        baseItemNativeType: "int",
        baseItemIds: [0],
        opaqueSiblingFieldCounts: [0],
      },
    });
  });

  it.each([
    ["wrong field case", [{ ...exactRestrictions[0], label: "willnotbuy" }, exactRestrictions[1]]],
    ["wrong root type", [
      { label: "WillNotBuy", type: "byte" as const, value: 0 },
      exactRestrictions[1],
    ]],
    ["duplicate root", [...exactRestrictions, exactRestrictions[0]]],
    ["wrong entry struct", [
      {
        label: "WillNotBuy",
        type: "list" as const,
        value: [{
          typeId: 0,
          fields: [{ label: "BaseItem", type: "int" as const, value: 1 }],
        }],
      },
      exactRestrictions[1],
    ]],
    ["wrong BaseItem type", [
      {
        label: "WillNotBuy",
        type: "list" as const,
        value: [{
          typeId: ENTRY_TYPE,
          fields: [{ label: "BaseItem", type: "dword" as const, value: 1 }],
        }],
      },
      exactRestrictions[1],
    ]],
    ["negative BaseItem", [
      {
        label: "WillNotBuy",
        type: "list" as const,
        value: [{
          typeId: ENTRY_TYPE,
          fields: [{ label: "BaseItem", type: "int" as const, value: -1 }],
        }],
      },
      exactRestrictions[1],
    ]],
    ["opaque sibling", [
      {
        label: "WillNotBuy",
        type: "list" as const,
        value: [{
          typeId: ENTRY_TYPE,
          fields: [
            { label: "BaseItem", type: "int" as const, value: 1 },
            { label: "Opaque", type: "byte" as const, value: 1 },
          ],
        }],
      },
      exactRestrictions[1],
    ]],
  ] as const)("keeps %s restrictions preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.stores[0]?.storeRestrictionsRaw).toBeUndefined();
  });

  it("binds both ordered lists and physical presence into the GIT dependency fingerprint", () => {
    const first = parseAreaObjectsFromGitGff(git(exactRestrictions));
    const changed = structuredClone(exactRestrictions);
    if (changed[0]?.type === "list") {
      const baseItem = changed[0].value[0]?.fields[0];
      if (baseItem?.type === "int") baseItem.value = 3;
    }
    const second = parseAreaObjectsFromGitGff(git(changed));
    expect(second?.dependencyFingerprint).not.toBe(first?.dependencyFingerprint);
    expect(parseAreaObjectsFromGitGff(git([exactRestrictions[1]!]))?.dependencyFingerprint)
      .not.toBe(first?.dependencyFingerprint);
  });
});

function git(fields: SupportedGffField[]): Buffer {
  return buildGffBuffer([{
    label: "StoreList",
    type: "list",
    value: [{
      typeId: 11,
      fields: [
        { label: "ResRef", type: "resref", value: "x2_merc_dye" },
        { label: "Tag", type: "cexostring", value: "x2_merc_dye" },
        ...fields,
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "XOrientation", type: "float", value: 0 },
        { label: "YOrientation", type: "float", value: -1 },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
