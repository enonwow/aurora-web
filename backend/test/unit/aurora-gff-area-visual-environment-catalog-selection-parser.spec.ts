import {
  parseAreaMetadataFromAreGff,
  parseAreaVisualEnvironmentCatalogSelectionFromAreGff,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const FIELDS: readonly SupportedGffField[] = [
  { label: "LightingScheme", type: "byte", value: 2 },
  { label: "SkyBox", type: "byte", value: 1 },
];

const bytes = (fields: readonly SupportedGffField[]) =>
  buildGffBuffer([...fields], "ARE ", 0xffff_ffff);

describe("exact ARE visual-environment catalog-selection parser", () => {
  it("exposes the exact complete native Byte pair and dependency identity", () => {
    const value = { lightingSchemeRowIndex: 2, skyBoxRowIndex: 1 };
    expect(parseAreaVisualEnvironmentCatalogSelectionFromAreGff(bytes(FIELDS))).toEqual(value);
    expect(parseAreaMetadataFromAreGff(bytes(FIELDS))?.visualEnvironmentCatalogSelection)
      .toEqual(value);
    expect(parseAreaMetadataFromAreGff(bytes(FIELDS))?.dependencyFingerprint).not.toBe(
      parseAreaMetadataFromAreGff(bytes([
        { label: "LightingScheme", type: "byte", value: 3 },
        FIELDS[1]!,
      ]))?.dependencyFingerprint,
    );
  });

  it.each<[string, SupportedGffField[]]>([
    ["missing field", FIELDS.slice(1)],
    ["wrong case", [{ label: "lightingscheme", type: "byte", value: 2 }, FIELDS[1]!]],
    ["wrong type", [{ label: "LightingScheme", type: "dword", value: 2 }, FIELDS[1]!]],
    ["duplicate case ambiguity", [...FIELDS, { label: "SKYBOX", type: "byte", value: 1 }]],
  ])("keeps a %s profile preserve-only", (_label, fields) => {
    expect(parseAreaVisualEnvironmentCatalogSelectionFromAreGff(bytes(fields))).toBeNull();
    expect(parseAreaMetadataFromAreGff(bytes(fields))?.visualEnvironmentCatalogSelection)
      .toBeUndefined();
  });
});
