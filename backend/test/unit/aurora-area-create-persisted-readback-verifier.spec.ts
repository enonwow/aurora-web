import { AuroraAreaCreatePersistedReadbackVerifier } from "../../src/modules/areas/adapters/outbound/blob/aurora-area-create-persisted-readback-verifier";
import {
  serializeEmptyAreaGic,
  serializeEmptyAreaGit,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-companion-writer";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

describe("AuroraAreaCreatePersistedReadbackVerifier", () => {
  it("independently accepts a complete strict resource set and IFO membership", async () => {
    const verifier = new AuroraAreaCreatePersistedReadbackVerifier();

    await expect(verifier.verify(inputFixture())).resolves.toEqual({
      valid: true,
      diagnostics: [],
    });
  });

  it("fails closed for malformed persisted resources and missing IFO membership", async () => {
    const verifier = new AuroraAreaCreatePersistedReadbackVerifier();
    const input = inputFixture();

    await expect(
      verifier.verify({
        ...input,
        resources: input.resources.map((resource) =>
          resource.extension === "are"
            ? { ...resource, bytes: Buffer.from("not-a-gff") }
            : resource,
        ),
        moduleIfo: { ...input.moduleIfo, bytes: emptyIfo() },
      }),
    ).resolves.toEqual({
      valid: false,
      diagnostics: expect.arrayContaining([
        expect.stringContaining("AREA_RESOURCE_PARSE_INVALID:are"),
        "AREA_READBACK_IFO_MEMBERSHIP_MISSING",
      ]),
    });
  });
});

function inputFixture() {
  const are = strictAre();
  const git = serializeEmptyAreaGit();
  const gic = serializeEmptyAreaGic();
  return {
    areaId: "area_new",
    resources: [
      resource("are", 2012, are),
      resource("git", 2023, git),
      resource("gic", 2046, gic),
    ],
    moduleIfo: {
      key: "module.ifo",
      size: ifoWithArea().length,
      sha256: "d".repeat(64),
      bytes: ifoWithArea(),
    },
  } as const;
}

function resource(
  extension: "are" | "git" | "gic",
  resourceType: number,
  bytes: Buffer,
) {
  return {
    extension,
    key: `area_new.${extension}`,
    fileName: `area_new.${extension}`,
    resourceType,
    size: bytes.length,
    sha256: extension.repeat(64).slice(0, 64),
    bytes,
  };
}

function ifoWithArea(): Buffer {
  return buildGffBuffer(
    [
      {
        label: "Mod_Area_list",
        type: "list",
        value: [
          {
            typeId: 6,
            fields: [{ label: "Area_Name", type: "resref", value: "area_new" }],
          },
        ],
      },
    ],
    "IFO ",
    0xffffffff,
  );
}

function emptyIfo(): Buffer {
  return buildGffBuffer(
    [{ label: "Mod_Area_list", type: "list", value: [] }],
    "IFO ",
    0xffffffff,
  );
}

function strictAre(): Buffer {
  return buildGffBuffer(strictAreFields(), "ARE ", 0xffffffff);
}

function strictAreFields(): SupportedGffField[] {
  return [
    { label: "ChanceLightning", type: "int", value: 0 },
    { label: "ChanceRain", type: "int", value: 0 },
    { label: "ChanceSnow", type: "int", value: 0 },
    { label: "Comments", type: "cexostring", value: "" },
    { label: "Creator_ID", type: "int", value: -1 },
    { label: "DayNightCycle", type: "byte", value: 1 },
    { label: "Expansion_List", type: "list", value: [] },
    { label: "Flags", type: "dword", value: 0 },
    { label: "FogClipDist", type: "float", value: 45 },
    { label: "Height", type: "int", value: 1 },
    { label: "ID", type: "int", value: -1 },
    { label: "IsNight", type: "byte", value: 0 },
    { label: "LightingScheme", type: "byte", value: 0 },
    { label: "LoadScreenID", type: "word", value: 0 },
    { label: "ModListenCheck", type: "int", value: 0 },
    { label: "ModSpotCheck", type: "int", value: 0 },
    { label: "MoonAmbientColor", type: "dword", value: 0 },
    { label: "MoonDiffuseColor", type: "dword", value: 13132900 },
    { label: "MoonFogAmount", type: "byte", value: 0 },
    { label: "MoonFogColor", type: "dword", value: 6566450 },
    { label: "MoonShadows", type: "byte", value: 1 },
    { label: "Name", type: "cexolocstring", value: { text: "Area New" } },
    { label: "NoRest", type: "byte", value: 0 },
    { label: "OnEnter", type: "resref", value: "" },
    { label: "OnExit", type: "resref", value: "" },
    { label: "OnHeartbeat", type: "resref", value: "" },
    { label: "OnUserDefined", type: "resref", value: "" },
    { label: "PlayerVsPlayer", type: "byte", value: 3 },
    { label: "ResRef", type: "resref", value: "area_new" },
    { label: "ShadowOpacity", type: "byte", value: 50 },
    { label: "SkyBox", type: "byte", value: 0 },
    { label: "SunAmbientColor", type: "dword", value: 6566450 },
    { label: "SunDiffuseColor", type: "dword", value: 16777215 },
    { label: "SunFogAmount", type: "byte", value: 0 },
    { label: "SunFogColor", type: "dword", value: 9535080 },
    { label: "SunShadows", type: "byte", value: 1 },
    { label: "Tag", type: "cexostring", value: "AreaNew" },
    { label: "Tile_List", type: "list", value: [strictTile()] },
    { label: "TileBrdrDisabled", type: "byte", value: 0 },
    { label: "Tileset", type: "resref", value: "tms01" },
    { label: "Version", type: "dword", value: 3 },
    { label: "Width", type: "int", value: 1 },
    { label: "WindPower", type: "int", value: 0 },
  ];
}

function strictTile() {
  return {
    typeId: 1,
    fields: [
      { label: "Tile_ID", type: "int" as const, value: 12 },
      { label: "Tile_Orientation", type: "int" as const, value: 0 },
      { label: "Tile_Height", type: "int" as const, value: 0 },
      { label: "Tile_MainLight1", type: "byte" as const, value: 0 },
      { label: "Tile_MainLight2", type: "byte" as const, value: 0 },
      { label: "Tile_SrcLight1", type: "byte" as const, value: 0 },
      { label: "Tile_SrcLight2", type: "byte" as const, value: 0 },
      { label: "Tile_AnimLoop1", type: "byte" as const, value: 1 },
      { label: "Tile_AnimLoop2", type: "byte" as const, value: 1 },
      { label: "Tile_AnimLoop3", type: "byte" as const, value: 1 },
    ],
  };
}
