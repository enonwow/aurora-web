import {
  parseRawGffDocument,
  type ParsedRawGffDocument
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-template-parser";

export type AreaCreationValidationSeverity = "ERROR" | "WARN" | "INFO";

export type AreaCreationValidationDiagnosticCode =
  | "AREA_RESOURCE_PARSE_INVALID"
  | "AREA_RESOURCE_FILE_TYPE_INVALID"
  | "ARE_REQUIRED_FIELD_MISSING"
  | "ARE_REQUIRED_FIELD_TYPE_INVALID"
  | "ARE_TILE_CARDINALITY_MISMATCH"
  | "ARE_TILE_REQUIRED_FIELD_MISSING"
  | "ARE_TILE_FIELD_TYPE_INVALID"
  | "GIT_TOPLEVEL_FIELD_MISSING"
  | "GIT_TOPLEVEL_FIELD_TYPE_INVALID"
  | "GIT_AREA_PROPERTY_MISSING"
  | "GIT_AREA_PROPERTY_TYPE_INVALID"
  | "GIT_AREA_PROPERTY_DEFAULT_MISMATCH"
  | "GIC_TOPLEVEL_FIELD_MISSING"
  | "GIC_TOPLEVEL_FIELD_TYPE_INVALID"
  | "GIC_TOPLEVEL_LIST_NOT_EMPTY";

export interface AreaCreationValidationDiagnostic {
  code: AreaCreationValidationDiagnosticCode;
  severity: AreaCreationValidationSeverity;
  path: string;
  message: string;
  details: Readonly<Record<string, unknown>>;
  degraded: false;
}

export interface AreaCreationResourceSet {
  are: Buffer;
  git: Buffer;
  gic: Buffer;
}

export interface AreaCreationResourceSetValidationResult {
  valid: boolean;
  diagnostics: AreaCreationValidationDiagnostic[];
}

type SupportedGffField = ParsedRawGffDocument["fields"][number];
type GffFieldType = SupportedGffField["type"];

interface RequiredFieldProfile {
  label: string;
  type: GffFieldType;
}

interface RequiredIntDefaultProfile extends RequiredFieldProfile {
  type: "int";
  value: number;
}

const ARE_ROOT_PROFILE: readonly RequiredFieldProfile[] = [
  { label: "ChanceLightning", type: "int" },
  { label: "ChanceRain", type: "int" },
  { label: "ChanceSnow", type: "int" },
  { label: "Comments", type: "cexostring" },
  { label: "Creator_ID", type: "int" },
  { label: "DayNightCycle", type: "byte" },
  { label: "Expansion_List", type: "list" },
  { label: "Flags", type: "dword" },
  { label: "FogClipDist", type: "float" },
  { label: "Height", type: "int" },
  { label: "ID", type: "int" },
  { label: "IsNight", type: "byte" },
  { label: "LightingScheme", type: "byte" },
  { label: "LoadScreenID", type: "word" },
  { label: "ModListenCheck", type: "int" },
  { label: "ModSpotCheck", type: "int" },
  { label: "MoonAmbientColor", type: "dword" },
  { label: "MoonDiffuseColor", type: "dword" },
  { label: "MoonFogAmount", type: "byte" },
  { label: "MoonFogColor", type: "dword" },
  { label: "MoonShadows", type: "byte" },
  { label: "Name", type: "cexolocstring" },
  { label: "NoRest", type: "byte" },
  { label: "OnEnter", type: "resref" },
  { label: "OnExit", type: "resref" },
  { label: "OnHeartbeat", type: "resref" },
  { label: "OnUserDefined", type: "resref" },
  { label: "PlayerVsPlayer", type: "byte" },
  { label: "ResRef", type: "resref" },
  { label: "ShadowOpacity", type: "byte" },
  { label: "SkyBox", type: "byte" },
  { label: "SunAmbientColor", type: "dword" },
  { label: "SunDiffuseColor", type: "dword" },
  { label: "SunFogAmount", type: "byte" },
  { label: "SunFogColor", type: "dword" },
  { label: "SunShadows", type: "byte" },
  { label: "Tag", type: "cexostring" },
  { label: "Tile_List", type: "list" },
  { label: "TileBrdrDisabled", type: "byte" },
  { label: "Tileset", type: "resref" },
  { label: "Version", type: "dword" },
  { label: "Width", type: "int" },
  { label: "WindPower", type: "int" }
];

const ARE_TILE_PROFILE: readonly RequiredFieldProfile[] = [
  { label: "Tile_ID", type: "int" },
  { label: "Tile_Orientation", type: "int" },
  { label: "Tile_Height", type: "int" },
  { label: "Tile_MainLight1", type: "byte" },
  { label: "Tile_MainLight2", type: "byte" },
  { label: "Tile_SrcLight1", type: "byte" },
  { label: "Tile_SrcLight2", type: "byte" },
  { label: "Tile_AnimLoop1", type: "byte" },
  { label: "Tile_AnimLoop2", type: "byte" },
  { label: "Tile_AnimLoop3", type: "byte" }
];

const AREA_OBJECT_LIST_LABELS = [
  "Creature List",
  "Door List",
  "Encounter List",
  "List",
  "SoundList",
  "StoreList",
  "TriggerList",
  "WaypointList",
  "Placeable List"
] as const;

const GIT_ROOT_PROFILE: readonly RequiredFieldProfile[] = [
  { label: "AreaProperties", type: "struct" },
  ...AREA_OBJECT_LIST_LABELS.map((label) => ({ label, type: "list" as const }))
];

const AUR_S05_05_AREA_PROPERTY_DEFAULTS: readonly RequiredIntDefaultProfile[] = [
  { label: "AmbientSndDay", type: "int", value: 31 },
  { label: "AmbientSndNight", type: "int", value: 31 },
  { label: "AmbientSndDayVol", type: "int", value: 32 },
  { label: "AmbientSndNitVol", type: "int", value: 32 },
  { label: "EnvAudio", type: "int", value: 0 },
  { label: "MusicBattle", type: "int", value: 34 },
  { label: "MusicDay", type: "int", value: 20 },
  { label: "MusicNight", type: "int", value: 20 },
  { label: "MusicDelay", type: "int", value: 90000 }
];

/**
 * Independently validates the three GFF resources emitted for a blank Area.
 *
 * The schema is intentionally not derived from an Aurora Web writer. Its ARE
 * vocabulary and broad GFF types are bound to the native Area corpus plus the
 * recovered reader/writer anchors; the GIT defaults and GIC lanes are the
 * narrow AUR-S05-05 MicroSet/Tiny creation profile. Passing this structural
 * gate is necessary but does not claim Toolset or NWN runtime acceptance.
 */
export function validateAreaCreationResourceSet(
  resources: AreaCreationResourceSet
): AreaCreationResourceSetValidationResult {
  const diagnostics: AreaCreationValidationDiagnostic[] = [];
  const are = parseResource(resources.are, "are", "ARE ", diagnostics);
  const git = parseResource(resources.git, "git", "GIT ", diagnostics);
  const gic = parseResource(resources.gic, "gic", "GIC ", diagnostics);

  if (are) validateAre(are, diagnostics);
  if (git) validateGit(git, diagnostics);
  if (gic) validateGic(gic, diagnostics);

  return {
    valid: diagnostics.every((diagnostic) => diagnostic.severity !== "ERROR"),
    diagnostics
  };
}

function parseResource(
  bytes: Buffer,
  path: "are" | "git" | "gic",
  expectedFileType: "ARE " | "GIT " | "GIC ",
  diagnostics: AreaCreationValidationDiagnostic[]
): ParsedRawGffDocument | null {
  const document = parseRawGffDocument(bytes);
  if (!document) {
    diagnostics.push(errorDiagnostic(
      "AREA_RESOURCE_PARSE_INVALID",
      path,
      `The ${path.toUpperCase()} resource is not a readable GFF document.`,
      { expectedFileType }
    ));
    return null;
  }
  if (document.fileType !== expectedFileType) {
    diagnostics.push(errorDiagnostic(
      "AREA_RESOURCE_FILE_TYPE_INVALID",
      path,
      `The ${path.toUpperCase()} resource has the wrong GFF file type.`,
      { expectedFileType, actualFileType: document.fileType }
    ));
    return null;
  }
  return document;
}

function validateAre(
  document: ParsedRawGffDocument,
  diagnostics: AreaCreationValidationDiagnostic[]
): void {
  validateRequiredFields(document.fields, ARE_ROOT_PROFILE, "are", {
    missing: "ARE_REQUIRED_FIELD_MISSING",
    invalidType: "ARE_REQUIRED_FIELD_TYPE_INVALID"
  }, diagnostics);

  const width = readExactNumericField(document.fields, "Width", "int");
  const height = readExactNumericField(document.fields, "Height", "int");
  const tileList = readExactField(document.fields, "Tile_List", "list");
  if (!tileList || tileList.type !== "list") return;

  if (width !== undefined && height !== undefined) {
    const expected = width * height;
    if (!Number.isSafeInteger(expected) || tileList.value.length !== expected) {
      diagnostics.push(errorDiagnostic(
        "ARE_TILE_CARDINALITY_MISMATCH",
        "are.Tile_List",
        "ARE Tile_List cardinality must equal Width*Height.",
        { width, height, expected, actual: tileList.value.length }
      ));
    }
  }

  tileList.value.forEach((tile, tileIndex) => {
    validateRequiredFields(tile.fields, ARE_TILE_PROFILE, `are.Tile_List[${tileIndex}]`, {
      missing: "ARE_TILE_REQUIRED_FIELD_MISSING",
      invalidType: "ARE_TILE_FIELD_TYPE_INVALID"
    }, diagnostics);
  });
}

function validateGit(
  document: ParsedRawGffDocument,
  diagnostics: AreaCreationValidationDiagnostic[]
): void {
  validateRequiredFields(document.fields, GIT_ROOT_PROFILE, "git", {
    missing: "GIT_TOPLEVEL_FIELD_MISSING",
    invalidType: "GIT_TOPLEVEL_FIELD_TYPE_INVALID"
  }, diagnostics);

  const areaProperties = readExactField(document.fields, "AreaProperties", "struct");
  if (!areaProperties || areaProperties.type !== "struct") return;

  for (const profile of AUR_S05_05_AREA_PROPERTY_DEFAULTS) {
    const path = `git.AreaProperties.${profile.label}`;
    const field = findField(areaProperties.value.fields, profile.label);
    if (!field) {
      diagnostics.push(errorDiagnostic(
        "GIT_AREA_PROPERTY_MISSING",
        path,
        `GIT AreaProperties is missing required field ${profile.label}.`,
        { expectedType: profile.type, expectedValue: profile.value }
      ));
      continue;
    }
    if (field.type !== profile.type) {
      diagnostics.push(errorDiagnostic(
        "GIT_AREA_PROPERTY_TYPE_INVALID",
        path,
        `GIT AreaProperties field ${profile.label} has the wrong GFF type.`,
        { expectedType: profile.type, actualType: field.type }
      ));
      continue;
    }
    if (field.value !== profile.value) {
      diagnostics.push(errorDiagnostic(
        "GIT_AREA_PROPERTY_DEFAULT_MISMATCH",
        path,
        `GIT AreaProperties field ${profile.label} does not match the AUR-S05-05 default.`,
        { expectedValue: profile.value, actualValue: field.value }
      ));
    }
  }
}

function validateGic(
  document: ParsedRawGffDocument,
  diagnostics: AreaCreationValidationDiagnostic[]
): void {
  const profile = AREA_OBJECT_LIST_LABELS.map((label) => ({ label, type: "list" as const }));
  validateRequiredFields(document.fields, profile, "gic", {
    missing: "GIC_TOPLEVEL_FIELD_MISSING",
    invalidType: "GIC_TOPLEVEL_FIELD_TYPE_INVALID"
  }, diagnostics);

  for (const label of AREA_OBJECT_LIST_LABELS) {
    const field = readExactField(document.fields, label, "list");
    if (!field || field.type !== "list" || field.value.length === 0) continue;
    diagnostics.push(errorDiagnostic(
      "GIC_TOPLEVEL_LIST_NOT_EMPTY",
      `gic.${label}`,
      `Blank-Area GIC lane ${label} must be empty.`,
      { actualCount: field.value.length }
    ));
  }
}

function validateRequiredFields(
  fields: readonly SupportedGffField[],
  profile: readonly RequiredFieldProfile[],
  parentPath: string,
  codes: {
    missing: Extract<AreaCreationValidationDiagnosticCode,
      "ARE_REQUIRED_FIELD_MISSING" | "ARE_TILE_REQUIRED_FIELD_MISSING" |
      "GIT_TOPLEVEL_FIELD_MISSING" | "GIC_TOPLEVEL_FIELD_MISSING">;
    invalidType: Extract<AreaCreationValidationDiagnosticCode,
      "ARE_REQUIRED_FIELD_TYPE_INVALID" | "ARE_TILE_FIELD_TYPE_INVALID" |
      "GIT_TOPLEVEL_FIELD_TYPE_INVALID" | "GIC_TOPLEVEL_FIELD_TYPE_INVALID">;
  },
  diagnostics: AreaCreationValidationDiagnostic[]
): void {
  for (const required of profile) {
    const path = `${parentPath}.${required.label}`;
    const field = findField(fields, required.label);
    if (!field) {
      diagnostics.push(errorDiagnostic(
        codes.missing,
        path,
        `Required GFF field ${required.label} is missing.`,
        { expectedType: required.type }
      ));
      continue;
    }
    if (field.type !== required.type) {
      diagnostics.push(errorDiagnostic(
        codes.invalidType,
        path,
        `GFF field ${required.label} has the wrong type.`,
        { expectedType: required.type, actualType: field.type }
      ));
    }
  }
}

function findField(
  fields: readonly SupportedGffField[],
  label: string
): SupportedGffField | undefined {
  return fields.find((field) => field.label === label);
}

function readExactField<TType extends GffFieldType>(
  fields: readonly SupportedGffField[],
  label: string,
  type: TType
): Extract<SupportedGffField, { type: TType }> | undefined {
  const field = findField(fields, label);
  return field?.type === type
    ? field as Extract<SupportedGffField, { type: TType }>
    : undefined;
}

function readExactNumericField(
  fields: readonly SupportedGffField[],
  label: string,
  type: "int"
): number | undefined {
  return readExactField(fields, label, type)?.value;
}

function errorDiagnostic(
  code: AreaCreationValidationDiagnosticCode,
  path: string,
  message: string,
  details: Readonly<Record<string, unknown>>
): AreaCreationValidationDiagnostic {
  return {
    code,
    severity: "ERROR",
    path,
    message,
    details,
    degraded: false
  };
}
