import { AuroraAreaUpdatePersistedReadbackVerifier } from "../../src/modules/areas/adapters/outbound/blob/aurora-area-update-persisted-readback-verifier";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import type { AreaCreatePersistedReadbackVerifierPort } from "../../src/modules/areas/application/ports/area-create-readback-verifier.port";

function environment() {
  return {
    dayNightMode: "cycle" as const,
    shadowOpacity: 50,
    chanceRain: 20,
    chanceSnow: 0,
    chanceLightning: 35,
    sun: { ambientColor: 0x112233, diffuseColor: 0x445566, fogColor: 0x778899, fogAmount: 7, shadows: true },
    moon: { ambientColor: 0xaabbcc, diffuseColor: 0xddeeff, fogColor: 0x010203, fogAmount: 15, shadows: false },
  };
}

function environmentFields(moonFogAmount = 15): SupportedGffField[] {
  return [
    { label: "DayNightCycle", type: "byte", value: 1 },
    { label: "IsNight", type: "byte", value: 0 },
    { label: "ShadowOpacity", type: "byte", value: 50 },
    { label: "ChanceRain", type: "int", value: 20 },
    { label: "ChanceSnow", type: "int", value: 0 },
    { label: "ChanceLightning", type: "int", value: 35 },
    { label: "SunAmbientColor", type: "dword", value: 0x112233 },
    { label: "SunDiffuseColor", type: "dword", value: 0x445566 },
    { label: "SunFogColor", type: "dword", value: 0x778899 },
    { label: "SunFogAmount", type: "byte", value: 7 },
    { label: "SunShadows", type: "byte", value: 1 },
    { label: "MoonAmbientColor", type: "dword", value: 0xaabbcc },
    { label: "MoonDiffuseColor", type: "dword", value: 0xddeeff },
    { label: "MoonFogColor", type: "dword", value: 0x010203 },
    { label: "MoonFogAmount", type: "byte", value: moonFogAmount },
    { label: "MoonShadows", type: "byte", value: 0 },
  ];
}

function resources(moonFogAmount = 15) {
  const areFields: SupportedGffField[] = [
    { label: "ResRef", type: "resref", value: "crypt01" },
    { label: "Tag", type: "cexostring", value: "crypt01" },
    ...environmentFields(moonFogAmount),
    { label: "Width", type: "int", value: 2 },
    { label: "Height", type: "int", value: 2 },
    { label: "Tileset", type: "resref", value: "tin01" },
    {
      label: "Tile_List",
      type: "list",
      value: Array.from({ length: 4 }, () => ({
        typeId: 1,
        fields: [
          { label: "Tile_ID", type: "int" as const, value: 12 },
          { label: "Tile_Orientation", type: "int" as const, value: 0 },
          { label: "Tile_Height", type: "int" as const, value: 0 },
        ],
      })),
    },
  ];
  const are = buildGffBuffer(areFields, "ARE ", 0);
  const companions = (fileType: "GIT " | "GIC ") => {
    const fields: SupportedGffField[] = [
      ...[
      "Creature List", "Door List", "Encounter List", "List", "Placeable List",
      "SoundList", "StoreList", "TriggerList", "WaypointList",
      ].map((label): SupportedGffField => ({ label, type: "list", value: [] })),
    ];
    return buildGffBuffer(fields, fileType, 0);
  };
  const git = companions("GIT ");
  const gic = companions("GIC ");
  const ifoFields: SupportedGffField[] = [{
    label: "Mod_Area_list",
    type: "list",
    value: [{ typeId: 6, fields: [{ label: "Area_Name", type: "resref", value: "crypt01" }] }],
  }];
  const ifo = buildGffBuffer(ifoFields, "IFO ", 0);
  const input: Parameters<AreaCreatePersistedReadbackVerifierPort["verify"]>[0] = {
    areaId: "crypt01",
    expectedAreaVisualEnvironment: environment(),
    resources: [
      { extension: "are" as const, key: "crypt01.are", fileName: "crypt01.are", resourceType: 2012, size: are.length, sha256: "a".repeat(64), bytes: are },
      { extension: "git" as const, key: "crypt01.git", fileName: "crypt01.git", resourceType: 2023, size: git.length, sha256: "b".repeat(64), bytes: git },
      { extension: "gic" as const, key: "crypt01.gic", fileName: "crypt01.gic", resourceType: 2046, size: gic.length, sha256: "c".repeat(64), bytes: gic },
    ],
    moduleIfo: { key: "module.ifo", size: ifo.length, sha256: "d".repeat(64), bytes: ifo },
  };
  return input;
}

describe("Area visual-environment persisted readback", () => {
  it("accepts the complete exact target", async () => {
    await expect(new AuroraAreaUpdatePersistedReadbackVerifier().verify(resources()))
      .resolves.toEqual({ valid: true, diagnostics: [] });
  });

  it("rejects a persisted tuple that differs from the requested target", async () => {
    await expect(new AuroraAreaUpdatePersistedReadbackVerifier().verify(resources(14)))
      .resolves.toEqual({
        valid: false,
        diagnostics: ["AREA_UPDATE_READBACK_VISUAL_ENVIRONMENT_MISMATCH"],
      });
  });
});
