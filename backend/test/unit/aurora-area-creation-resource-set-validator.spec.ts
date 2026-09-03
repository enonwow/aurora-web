import { buildGffBuffer, type SupportedGffField } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { validateAreaCreationResourceSet } from "../../src/modules/areas/adapters/outbound/blob/aurora-area-creation-resource-set-validator";

describe("validateAreaCreationResourceSet", () => {
  it("accepts the complete strict ARE/GIT/GIC creation profile and permits preserve-first extras", () => {
    const resources = buildValidResourceSet({
      extraAreFields: [{ label: "FutureField", type: "cexostring", value: "preserve" }]
    });

    expect(validateAreaCreationResourceSet(resources)).toEqual({
      valid: true,
      diagnostics: []
    });
  });

  it("reports unreadable or incorrectly typed resources without validating them as another lane", () => {
    const resources = buildValidResourceSet();
    const result = validateAreaCreationResourceSet({
      are: Buffer.from("not-a-gff"),
      git: resources.gic,
      gic: resources.gic
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map(pickDiagnosticIdentity)).toEqual([
      {
        code: "AREA_RESOURCE_PARSE_INVALID",
        severity: "ERROR",
        path: "are"
      },
      {
        code: "AREA_RESOURCE_FILE_TYPE_INVALID",
        severity: "ERROR",
        path: "git"
      }
    ]);
  });

  it("requires every ARE root label with its native broad GFF type", () => {
    const fields = buildValidAreFields();
    replaceField(fields, "ChanceLightning", { label: "ChanceLightning", type: "byte", value: 0 });
    removeField(fields, "Comments");

    const result = validateAreaCreationResourceSet({
      ...buildValidResourceSet(),
      are: buildGffBuffer(fields, "ARE ", 0xffffffff)
    });

    expect(result.diagnostics.map(pickDiagnosticIdentity)).toEqual([
      {
        code: "ARE_REQUIRED_FIELD_TYPE_INVALID",
        severity: "ERROR",
        path: "are.ChanceLightning"
      },
      {
        code: "ARE_REQUIRED_FIELD_MISSING",
        severity: "ERROR",
        path: "are.Comments"
      }
    ]);
  });

  it("requires a dense Width*Height Tile_List and all ten native fields on every tile", () => {
    const fields = buildValidAreFields();
    const tileList = getField(fields, "Tile_List");
    if (tileList.type !== "list") throw new Error("test fixture Tile_List is not a list");
    tileList.value.pop();
    removeField(tileList.value[0]!.fields, "Tile_AnimLoop3");
    replaceField(tileList.value[1]!.fields, "Tile_Height", {
      label: "Tile_Height",
      type: "float",
      value: 0
    });

    const result = validateAreaCreationResourceSet({
      ...buildValidResourceSet(),
      are: buildGffBuffer(fields, "ARE ", 0xffffffff)
    });

    expect(result.diagnostics.map(pickDiagnosticIdentity)).toEqual([
      {
        code: "ARE_TILE_CARDINALITY_MISMATCH",
        severity: "ERROR",
        path: "are.Tile_List"
      },
      {
        code: "ARE_TILE_REQUIRED_FIELD_MISSING",
        severity: "ERROR",
        path: "are.Tile_List[0].Tile_AnimLoop3"
      },
      {
        code: "ARE_TILE_FIELD_TYPE_INVALID",
        severity: "ERROR",
        path: "are.Tile_List[1].Tile_Height"
      }
    ]);
    expect(result.diagnostics[0]?.details).toEqual({
      width: 2,
      height: 2,
      expected: 4,
      actual: 3
    });
  });

  it("requires canonical GIT List plus the exact nine AUR-S05-05 int defaults", () => {
    const fields = buildValidGitFields();
    replaceField(fields, "List", { label: "ItemList", type: "list", value: [] });
    const areaProperties = getField(fields, "AreaProperties");
    if (areaProperties.type !== "struct") throw new Error("test fixture AreaProperties is not a struct");
    removeField(areaProperties.value.fields, "MusicNight");
    replaceField(areaProperties.value.fields, "AmbientSndDayVol", {
      label: "AmbientSndDayVol",
      type: "dword",
      value: 32
    });
    replaceField(areaProperties.value.fields, "MusicDelay", {
      label: "MusicDelay",
      type: "int",
      value: 123
    });

    const result = validateAreaCreationResourceSet({
      ...buildValidResourceSet(),
      git: buildGffBuffer(fields, "GIT ", 0xffffffff)
    });

    expect(result.diagnostics.map(pickDiagnosticIdentity)).toEqual([
      {
        code: "GIT_TOPLEVEL_FIELD_MISSING",
        severity: "ERROR",
        path: "git.List"
      },
      {
        code: "GIT_AREA_PROPERTY_TYPE_INVALID",
        severity: "ERROR",
        path: "git.AreaProperties.AmbientSndDayVol"
      },
      {
        code: "GIT_AREA_PROPERTY_MISSING",
        severity: "ERROR",
        path: "git.AreaProperties.MusicNight"
      },
      {
        code: "GIT_AREA_PROPERTY_DEFAULT_MISMATCH",
        severity: "ERROR",
        path: "git.AreaProperties.MusicDelay"
      }
    ]);
  });

  it("requires all nine GIC list lanes to be present, typed as lists, and empty", () => {
    const fields = buildValidGicFields();
    removeField(fields, "Door List");
    replaceField(fields, "SoundList", { label: "SoundList", type: "struct", value: { typeId: 0, fields: [] } });
    replaceField(fields, "WaypointList", {
      label: "WaypointList",
      type: "list",
      value: [{ typeId: 0, fields: [] }]
    });

    const result = validateAreaCreationResourceSet({
      ...buildValidResourceSet(),
      gic: buildGffBuffer(fields, "GIC ", 0xffffffff)
    });

    expect(result.diagnostics.map(pickDiagnosticIdentity)).toEqual([
      {
        code: "GIC_TOPLEVEL_FIELD_MISSING",
        severity: "ERROR",
        path: "gic.Door List"
      },
      {
        code: "GIC_TOPLEVEL_FIELD_TYPE_INVALID",
        severity: "ERROR",
        path: "gic.SoundList"
      },
      {
        code: "GIC_TOPLEVEL_LIST_NOT_EMPTY",
        severity: "ERROR",
        path: "gic.WaypointList"
      }
    ]);
  });

  it("returns byte-for-byte deterministic diagnostic data for identical inputs", () => {
    const resources = buildValidResourceSet();
    const invalid = { ...resources, are: Buffer.alloc(0), git: Buffer.alloc(1), gic: Buffer.alloc(2) };
    const first = validateAreaCreationResourceSet(invalid);
    const second = validateAreaCreationResourceSet(invalid);

    expect(first.diagnostics.map(pickDiagnosticIdentity)).toEqual([
      { code: "AREA_RESOURCE_PARSE_INVALID", severity: "ERROR", path: "are" },
      { code: "AREA_RESOURCE_PARSE_INVALID", severity: "ERROR", path: "git" },
      { code: "AREA_RESOURCE_PARSE_INVALID", severity: "ERROR", path: "gic" }
    ]);
    expect(first.diagnostics.every((diagnostic) =>
      diagnostic.message.length > 0 &&
      diagnostic.details !== null &&
      diagnostic.degraded === false
    )).toBe(true);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

function buildValidResourceSet(options: { extraAreFields?: SupportedGffField[] } = {}) {
  return {
    are: buildGffBuffer(
      [...buildValidAreFields(), ...(options.extraAreFields ?? [])],
      "ARE ",
      0xffffffff
    ),
    git: buildGffBuffer(buildValidGitFields(), "GIT ", 0xffffffff),
    gic: buildGffBuffer(buildValidGicFields(), "GIC ", 0xffffffff)
  };
}

function buildValidAreFields(): SupportedGffField[] {
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
    { label: "Height", type: "int", value: 2 },
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
    { label: "Name", type: "cexolocstring", value: { text: "Area 001" } },
    { label: "NoRest", type: "byte", value: 0 },
    { label: "OnEnter", type: "resref", value: "" },
    { label: "OnExit", type: "resref", value: "" },
    { label: "OnHeartbeat", type: "resref", value: "" },
    { label: "OnUserDefined", type: "resref", value: "" },
    { label: "PlayerVsPlayer", type: "byte", value: 3 },
    { label: "ResRef", type: "resref", value: "area001" },
    { label: "ShadowOpacity", type: "byte", value: 50 },
    { label: "SkyBox", type: "byte", value: 0 },
    { label: "SunAmbientColor", type: "dword", value: 6566450 },
    { label: "SunDiffuseColor", type: "dword", value: 16777215 },
    { label: "SunFogAmount", type: "byte", value: 0 },
    { label: "SunFogColor", type: "dword", value: 9535080 },
    { label: "SunShadows", type: "byte", value: 1 },
    { label: "Tag", type: "cexostring", value: "Area001" },
    { label: "Tile_List", type: "list", value: Array.from({ length: 4 }, () => buildValidTile()) },
    { label: "TileBrdrDisabled", type: "byte", value: 0 },
    { label: "Tileset", type: "resref", value: "tms01" },
    { label: "Version", type: "dword", value: 3 },
    { label: "Width", type: "int", value: 2 },
    { label: "WindPower", type: "int", value: 0 }
  ];
}

function buildValidTile(): { typeId: number; fields: SupportedGffField[] } {
  return {
    typeId: 1,
    fields: [
      { label: "Tile_ID", type: "int", value: 12 },
      { label: "Tile_Orientation", type: "int", value: 0 },
      { label: "Tile_Height", type: "int", value: 0 },
      { label: "Tile_MainLight1", type: "byte", value: 0 },
      { label: "Tile_MainLight2", type: "byte", value: 0 },
      { label: "Tile_SrcLight1", type: "byte", value: 0 },
      { label: "Tile_SrcLight2", type: "byte", value: 0 },
      { label: "Tile_AnimLoop1", type: "byte", value: 1 },
      { label: "Tile_AnimLoop2", type: "byte", value: 1 },
      { label: "Tile_AnimLoop3", type: "byte", value: 1 }
    ]
  };
}

function buildValidGitFields(): SupportedGffField[] {
  return [
    {
      label: "AreaProperties",
      type: "struct",
      value: {
        typeId: 100,
        fields: [
          { label: "AmbientSndDay", type: "int", value: 31 },
          { label: "AmbientSndNight", type: "int", value: 31 },
          { label: "AmbientSndDayVol", type: "int", value: 32 },
          { label: "AmbientSndNitVol", type: "int", value: 32 },
          { label: "EnvAudio", type: "int", value: 0 },
          { label: "MusicBattle", type: "int", value: 34 },
          { label: "MusicDay", type: "int", value: 20 },
          { label: "MusicNight", type: "int", value: 20 },
          { label: "MusicDelay", type: "int", value: 90000 }
        ]
      }
    },
    ...buildValidGicFields()
  ];
}

function buildValidGicFields(): SupportedGffField[] {
  return [
    "Creature List",
    "Door List",
    "Encounter List",
    "List",
    "SoundList",
    "StoreList",
    "TriggerList",
    "WaypointList",
    "Placeable List"
  ].map((label) => ({ label, type: "list" as const, value: [] }));
}

function getField(fields: SupportedGffField[], label: string): SupportedGffField {
  const field = fields.find((candidate) => candidate.label === label);
  if (!field) throw new Error(`Missing test fixture field ${label}`);
  return field;
}

function removeField(fields: SupportedGffField[], label: string): void {
  const index = fields.findIndex((candidate) => candidate.label === label);
  if (index >= 0) fields.splice(index, 1);
}

function replaceField(fields: SupportedGffField[], label: string, replacement: SupportedGffField): void {
  const index = fields.findIndex((candidate) => candidate.label === label);
  if (index < 0) throw new Error(`Missing test fixture field ${label}`);
  fields[index] = replacement;
}

function pickDiagnosticIdentity(diagnostic: { code: string; severity: string; path: string }) {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    path: diagnostic.path
  };
}
