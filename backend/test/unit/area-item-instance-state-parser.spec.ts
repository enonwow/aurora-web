import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;
const defaults = {
  charges: 50,
  cost: 0,
  stolen: false,
  stackSize: 1,
  plot: false,
  addCost: 0,
  identified: false,
  cursed: false,
} as const;

describe("Area GIT ground-item instance-state parsing", () => {
  it("reads exact physical types and records canonical source presence", () => {
    const parsed = parseAreaObjectsFromGitGff(git([
      { label: "Charges", type: "byte", value: 7 },
      { label: "Cost", type: "dword", value: 4_294_967_295 },
      { label: "Stolen", type: "byte", value: 1 },
      { label: "StackSize", type: "word", value: 65_535 },
      { label: "Plot", type: "byte", value: 0 },
      { label: "AddCost", type: "dword", value: 99 },
      { label: "Identified", type: "byte", value: 1 },
      { label: "Cursed", type: "byte", value: 0 },
    ]));

    expect(parsed?.items[0]?.itemInstanceState).toEqual({
      presentFields: [
        "charges", "cost", "stolen", "stackSize", "plot", "addCost", "identified", "cursed",
      ],
      values: {
        charges: 7,
        cost: 4_294_967_295,
        stolen: true,
        stackSize: 65_535,
        plot: false,
        addCost: 99,
        identified: true,
        cursed: false,
      },
    });
  });

  it("resolves absent fields through Aurora reader defaults without inventing presence", () => {
    const state = parseAreaObjectsFromGitGff(git([
      { label: "Charges", type: "byte", value: 0 },
      { label: "Identified", type: "byte", value: 1 },
    ]))?.items[0]?.itemInstanceState;

    expect(state).toEqual({
      presentFields: ["charges", "identified"],
      values: { ...defaults, charges: 0, identified: true },
    });
  });

  it.each([
    ["duplicate", [
      { label: "Charges", type: "byte", value: 1 },
      { label: "Charges", type: "byte", value: 2 },
    ]],
    ["wrong case", [{ label: "charges", type: "byte", value: 1 }]],
    ["wrong type", [{ label: "Charges", type: "dword", value: 1 }]],
    ["non-boolean Byte", [{ label: "Plot", type: "byte", value: 2 }]],
  ] as const)("keeps a malformed %s state preserve-only", (_label, fields) => {
    const item = parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))?.items[0];
    expect(item).toBeDefined();
    expect(item?.itemInstanceState).toBeUndefined();
  });

  it("binds the exact state into the dependency fingerprint", () => {
    const first = parseAreaObjectsFromGitGff(git([
      { label: "Charges", type: "byte", value: 1 },
    ]));
    const second = parseAreaObjectsFromGitGff(git([
      { label: "Charges", type: "byte", value: 2 },
    ]));
    expect(second?.dependencyFingerprint).not.toBe(first?.dependencyFingerprint);
  });
});

function git(itemStateFields: SupportedGffField[]): Buffer {
  return buildGffBuffer([{
    label: "List",
    type: "list",
    value: [{
      typeId: 0,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
        { label: "Tag", type: "cexostring", value: "NW_CLOTH022" },
        ...itemStateFields,
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "XOrientation", type: "float", value: 0 },
        { label: "YOrientation", type: "float", value: -1 },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
