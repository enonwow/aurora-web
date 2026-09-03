import {
  parseAreaMetadataFromAreGff,
  parseAreaVisualEnvironmentScalarControlsFromAreGff,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const FIELDS: readonly SupportedGffField[] = [
  { label: "FogClipDist", type: "float", value: 45 },
  { label: "WindPower", type: "int", value: 0 },
];

function bytes(fields: readonly SupportedGffField[]) {
  return buildGffBuffer([...fields], "ARE ", 0xffff_ffff);
}

function replace(label: string, field: SupportedGffField): SupportedGffField[] {
  return FIELDS.map((candidate) => candidate.label === label ? field : candidate);
}

describe("exact ARE visual-environment scalar-controls parser", () => {
  it("exposes the exact complete native pair", () => {
    const value = { fogClipDistance: 45, windPower: 0 };
    expect(parseAreaVisualEnvironmentScalarControlsFromAreGff(bytes(FIELDS))).toEqual(value);
    expect(parseAreaMetadataFromAreGff(bytes(FIELDS))?.visualEnvironmentScalarControls).toEqual(value);
  });

  it.each<[string, SupportedGffField[]]>([
    ["missing field", FIELDS.slice(1)],
    ["wrong case", replace("WindPower", { label: "windpower", type: "int", value: 0 })],
    ["wrong type", replace("FogClipDist", { label: "FogClipDist", type: "dword", value: 45 })],
    ["duplicate case ambiguity", [...FIELDS, { label: "FOGCLIPDIST", type: "float", value: 45 }]],
    ["fractional retained float", replace("FogClipDist", { label: "FogClipDist", type: "float", value: 45.5 })],
    ["fog below Toolset minimum", replace("FogClipDist", { label: "FogClipDist", type: "float", value: 29 })],
    ["wind above Toolset maximum", replace("WindPower", { label: "WindPower", type: "int", value: 3 })],
  ])("keeps a %s profile preserve-only", (_label, fields) => {
    expect(parseAreaVisualEnvironmentScalarControlsFromAreGff(bytes(fields))).toBeNull();
    expect(parseAreaMetadataFromAreGff(bytes(fields))?.visualEnvironmentScalarControls).toBeUndefined();
  });

  it("includes the admitted pair in dependency identity", () => {
    const first = parseAreaMetadataFromAreGff(bytes(FIELDS));
    const second = parseAreaMetadataFromAreGff(bytes(replace(
      "FogClipDist",
      { label: "FogClipDist", type: "float", value: 46 },
    )));
    expect(first?.dependencyFingerprint).not.toBe(second?.dependencyFingerprint);
  });
});
