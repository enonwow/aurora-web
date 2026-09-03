import { parseAreaMetadataFromAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import { serializeAreaEditingDraftToAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-editing-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import type { SupportedGffField } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const SOURCE = Object.freeze({ fogClipDistance: 45, windPower: 0 });
const TARGET = Object.freeze({ fogClipDistance: 120, windPower: 2 });

function sourceFields(overrides: readonly SupportedGffField[] = []): SupportedGffField[] {
  const environment = overrides.length > 0 ? [...overrides] : [
    { label: "FogClipDist", type: "float", value: 45 },
    { label: "WindPower", type: "int", value: 0 },
  ] satisfies SupportedGffField[];
  return [
    { label: "EnvBefore", type: "cexostring", value: "preserve-before" },
    ...environment,
    { label: "LightingScheme", type: "byte", value: 3 },
    { label: "SkyBox", type: "byte", value: 52 },
    { label: "ShadowOpacity", type: "byte", value: 50 },
    { label: "EnvAfter", type: "cexostring", value: "preserve-after" },
    { label: "Width", type: "int", value: 1 },
    { label: "Height", type: "int", value: 1 },
    { label: "Tileset", type: "resref", value: "tin01" },
    { label: "Tile_List", type: "list", value: [{ typeId: 9, fields: [] }] },
  ];
}

function serialize(fields = sourceFields(), mutation: unknown = {
  expectedValue: SOURCE,
  value: TARGET,
}) {
  return serializeAreaEditingDraftToAreGff({
    areaResRef: "area_test",
    name: "Area Test",
    width: 1,
    height: 1,
    tilesetResRef: "tin01",
    visualEnvironmentScalarControls: mutation as never,
    tiles: [{ row: 0, col: 0, sourceRow: 0, sourceCol: 0, tileId: 12, orientation: 0, height: 0 }],
  }, { rootStructTypeId: 42, fields });
}

describe("exact ARE visual-environment scalar-controls writer", () => {
  it("replaces exactly the native pair and preserves unrelated fields in order", () => {
    const result = serialize();
    expect(parseAreaMetadataFromAreGff(result)?.visualEnvironmentScalarControls).toEqual(TARGET);
    const document = parseRawGffDocument(result);
    expect(document?.rootStructTypeId).toBe(42);
    expect(document?.fields.slice(0, 7)).toEqual([
      { label: "EnvBefore", type: "cexostring", value: "preserve-before" },
      { label: "FogClipDist", type: "float", value: 120 },
      { label: "WindPower", type: "int", value: 2 },
      { label: "LightingScheme", type: "byte", value: 3 },
      { label: "SkyBox", type: "byte", value: 52 },
      { label: "ShadowOpacity", type: "byte", value: 50 },
      { label: "EnvAfter", type: "cexostring", value: "preserve-after" },
    ]);
  });

  it.each<[string, SupportedGffField[], string]>([
    ["missing field", sourceFields([{ label: "WindPower", type: "int", value: 0 }]), "not admitted"],
    ["wrong type", sourceFields([
      { label: "FogClipDist", type: "dword", value: 45 },
      { label: "WindPower", type: "int", value: 0 },
    ]), "not admitted"],
    ["duplicate case ambiguity", sourceFields([
      { label: "FogClipDist", type: "float", value: 45 },
      { label: "FOGCLIPDIST", type: "float", value: 45 },
      { label: "WindPower", type: "int", value: 0 },
    ]), "not admitted"],
    ["fractional retained float", sourceFields([
      { label: "FogClipDist", type: "float", value: 45.5 },
      { label: "WindPower", type: "int", value: 0 },
    ]), "not admitted"],
  ])("rejects a %s source", (_label, fields, error) => {
    expect(() => serialize(fields)).toThrow(error);
  });

  it("rejects stale, unchanged, malformed, and provenance-free mutations", () => {
    expect(() => serialize(sourceFields(), {
      expectedValue: { fogClipDistance: 46, windPower: 0 },
      value: TARGET,
    })).toThrow("expectedValue does not match");
    expect(() => serialize(sourceFields(), { expectedValue: SOURCE, value: SOURCE })).toThrow("changed admitted complete CAS pair");
    expect(() => serialize(sourceFields(), {
      expectedValue: SOURCE,
      value: { fogClipDistance: 120.5, windPower: 2 },
    })).toThrow("changed admitted complete CAS pair");
    expect(() => serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test",
      name: "Area Test",
      width: 1,
      height: 1,
      tilesetResRef: "tin01",
      visualEnvironmentScalarControls: { expectedValue: SOURCE, value: TARGET } as never,
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    })).toThrow("requires retained ARE preservation");
  });
});
