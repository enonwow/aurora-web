import { createHash } from "node:crypto";

interface GffHeader {
  fileType: string;
  fileVersion: string;
  structOffset: number;
  structCount: number;
  fieldOffset: number;
  fieldCount: number;
  labelOffset: number;
  labelCount: number;
  fieldDataOffset: number;
  fieldDataCount: number;
  fieldIndicesOffset: number;
  fieldIndicesCount: number;
  listIndicesOffset: number;
  listIndicesCount: number;
}

interface GffStructEntry {
  typeId: number;
  dataOrOffset: number;
  fieldCount: number;
}

interface ParsedCExoLocString {
  strRef: number;
  text: string;
  entries: string[];
}

interface GffFieldRef {
  typeId: number;
  dataOrOffset: number;
}

export interface ParsedAreaSoundIds {
  ambientDay?: number;
  ambientNight?: number;
  ambientDayVolume?: number;
  ambientNightVolume?: number;
  envAudio?: number;
  musicDay?: number;
  musicNight?: number;
  musicBattle?: number;
  musicDelay?: number;
}

export type ParsedAreaObjectMetadataPrimitive = string | number | boolean;
export type ParsedAreaCreatureMetadataPrimitive = ParsedAreaObjectMetadataPrimitive;

interface ParsedAreaCreatureSpellListEntry {
  spellId?: number;
  spellLevel?: number;
  metaMagic?: number;
  flags?: number;
}

interface ParsedAreaCreatureClassListEntry {
  classId?: number;
  level?: number;
  knownSpellCount?: number;
  memorizedSpellCount?: number;
  knownSpells?: ParsedAreaCreatureSpellListEntry[];
  memorizedSpells?: ParsedAreaCreatureSpellListEntry[];
}

interface ParsedAreaCreatureSkillListEntry {
  skillId?: number;
  rank?: number;
}

interface ParsedAreaCreatureIdListEntry {
  featId?: number;
}

interface ParsedAreaCreatureSpecAbilityListEntry {
  spellId?: number;
  flags?: number;
  casterLevel?: number;
}

interface ParsedAreaCreatureInventoryItemListEntry {
  resRef?: string;
  x?: number;
  y?: number;
  dropable?: boolean;
  pickpocketable?: boolean;
  infinite?: boolean;
}

interface ParsedAreaCreatureEquipItemListEntry {
  resRef?: string;
  slotMask?: number;
  dropable?: boolean;
  pickpocketable?: boolean;
  infinite?: boolean;
}

export interface ParsedAreaMetadataBlueprint {
  sourceFileType: string;
  sourceFileVersion: string;
  sourceStructTypeId: number;
  name?: string;
  tag?: string;
  width?: number;
  height?: number;
  tileSet?: string;
  tileCount?: number;
  tiles: ParsedAreaTileBlueprint[];
  soundIds: ParsedAreaSoundIds;
  globalLighting: ParsedAreaGlobalLightingBlueprint;
  dependencyFingerprint: string;
}

export type ParsedAreaGlobalLightingFieldName =
  | "LightingScheme"
  | "ShadowOpacity"
  | "DayNightCycle"
  | "IsNight"
  | "SkyBox"
  | "FogClipDist"
  | "ChanceRain"
  | "ChanceSnow"
  | "ChanceLightning"
  | "WindPower"
  | "SunAmbientColor"
  | "SunDiffuseColor"
  | "SunFogColor"
  | "SunFogAmount"
  | "SunShadows"
  | "MoonAmbientColor"
  | "MoonDiffuseColor"
  | "MoonFogColor"
  | "MoonFogAmount"
  | "MoonShadows";

export interface ParsedAreaGlobalLightingField {
  field: ParsedAreaGlobalLightingFieldName;
  value: number;
}

export interface ParsedAreaGlobalLightingBlueprint {
  fields: ParsedAreaGlobalLightingField[];
}

export interface ParsedAreaTileBlueprint {
  index: number;
  row: number;
  col: number;
  tileId?: number;
  modelResRef?: string;
  orientation?: number;
  height?: number;
  mainLight1?: number;
  mainLight2?: number;
  sourceLight1?: number;
  sourceLight2?: number;
  animLoop1?: number;
  animLoop2?: number;
  animLoop3?: number;
}

export interface ParsedAreaPlacementBlueprint {
  listKind:
    | "placeable"
    | "door"
    | "creature"
    | "encounter"
    | "item"
    | "sound"
    | "store"
    | "trigger"
    | "waypoint";
  templateResRef?: string;
  tag?: string;
  localizedName?: string;
  description?: string;
  appearanceType?: number;
  genericType?: number;
  isStatic?: boolean;
  creatureMetadata?: Record<string, ParsedAreaCreatureMetadataPrimitive>;
  itemMetadata?: Record<string, ParsedAreaObjectMetadataPrimitive>;
  x: number;
  y: number;
  z: number;
  bearing: number;
  visualTransform?: ParsedAreaVisualTransformBlueprint;
  soundPositioning?: ParsedAreaSoundPositioningBlueprint;
  doorTransition?: ParsedAreaDoorTransitionBlueprint;
}

export interface ParsedAreaVisualTransformBlueprint {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  translateX: number;
  translateY: number;
  translateZ: number;
}

export interface ParsedAreaDoorTransitionBlueprint {
  linkedTarget: string;
  linkedModule: string;
  linkedTag: string;
  linkedWaypoint: string;
  loadScreen: string;
  flags: Record<string, boolean>;
  extra: Record<string, string | number | boolean | null>;
}

export interface ParsedAreaSoundPositioningPreserveBlueprint {
  timeWindow: string;
  hourMask: string;
  active?: boolean;
  whenToPlay?: "always" | "dayNight" | "hours";
  dayNight?: "both" | "day" | "night";
  hoursStart?: number;
  hoursEnd?: number;
  playStyle?: "once" | "repeat" | "loop";
  playOrder?: "sequential" | "random";
  intervalMs: number;
  intervalVariationMs: number;
  volume: number;
  volumeVariation: number;
  pitchVariation: number;
  priority: number;
  flags: Record<string, boolean>;
  extra: Record<string, string | number | boolean | null>;
}

export interface ParsedAreaSoundPositioningBlueprint {
  mode: "everywhere" | "random" | "specific";
  elevation: number;
  maxVolumeDistance: number;
  cutoffDistance: number;
  randomRangeWestEast: number;
  randomRangeNorthSouth: number;
  preserve: ParsedAreaSoundPositioningPreserveBlueprint;
}

export interface ParsedAreaObjectBlueprint {
  sourceFileType: string;
  sourceFileVersion: string;
  sourceStructTypeId: number;
  /**
   * Area audio settings from the GIT `AreaProperties` struct. In Aurora these
   * fields live only in the .git file (the .are writer never emits them).
   */
  soundIds: ParsedAreaSoundIds;
  placeables: ParsedAreaPlacementBlueprint[];
  doors: ParsedAreaPlacementBlueprint[];
  creatures: ParsedAreaPlacementBlueprint[];
  encounters: ParsedAreaPlacementBlueprint[];
  items: ParsedAreaPlacementBlueprint[];
  sounds: ParsedAreaPlacementBlueprint[];
  stores: ParsedAreaPlacementBlueprint[];
  triggers: ParsedAreaPlacementBlueprint[];
  waypoints: ParsedAreaPlacementBlueprint[];
  dependencyFingerprint: string;
}

const GFF_HEADER_SIZE_BYTES = 56;
const GFF_STRUCT_ENTRY_SIZE_BYTES = 12;
const GFF_FIELD_ENTRY_SIZE_BYTES = 12;
const GFF_LABEL_ENTRY_SIZE_BYTES = 16;
const AURORA_SPELL_FLAGS_RUNTIME_BIT = 1;
const AURORA_DEFAULT_SPELL_META_MAGIC = 0;
const AURORA_DEFAULT_SPECIAL_ABILITY_CASTER_LEVEL = 1;
const AURORA_MAX_SPECIAL_ABILITY_CASTER_LEVEL = 0xf;
const AURORA_DEFAULT_CREATURE_SKILL_COUNT = 28;
const AURORA_VISUAL_TRANSFORM_BASE_SCOPE = 0;

const FIELD_TYPE = {
  BYTE: 0,
  CHAR: 1,
  WORD: 2,
  SHORT: 3,
  DWORD: 4,
  INT: 5,
  FLOAT: 8,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12,
  STRUCT: 14,
  LIST: 15
} as const;

const AREA_GLOBAL_LIGHTING_FIELD_ALIASES: Array<{
  field: ParsedAreaGlobalLightingFieldName;
  aliases: readonly string[];
}> = [
  { field: "LightingScheme", aliases: ["LightingScheme", "LightScheme"] },
  { field: "ShadowOpacity", aliases: ["ShadowOpacity"] },
  { field: "DayNightCycle", aliases: ["DayNightCycle", "DayNight"] },
  { field: "IsNight", aliases: ["IsNight"] },
  { field: "SkyBox", aliases: ["SkyBox"] },
  { field: "FogClipDist", aliases: ["FogClipDist", "FogClipDistance"] },
  { field: "ChanceRain", aliases: ["ChanceRain"] },
  { field: "ChanceSnow", aliases: ["ChanceSnow"] },
  { field: "ChanceLightning", aliases: ["ChanceLightning"] },
  { field: "WindPower", aliases: ["WindPower"] },
  { field: "SunAmbientColor", aliases: ["SunAmbientColor"] },
  { field: "SunDiffuseColor", aliases: ["SunDiffuseColor"] },
  { field: "SunFogColor", aliases: ["SunFogColor"] },
  { field: "SunFogAmount", aliases: ["SunFogAmount"] },
  { field: "SunShadows", aliases: ["SunShadows"] },
  { field: "MoonAmbientColor", aliases: ["MoonAmbientColor"] },
  { field: "MoonDiffuseColor", aliases: ["MoonDiffuseColor"] },
  { field: "MoonFogColor", aliases: ["MoonFogColor"] },
  { field: "MoonFogAmount", aliases: ["MoonFogAmount"] },
  { field: "MoonShadows", aliases: ["MoonShadows"] }
];

class GffView {
  private constructor(
    private readonly bytes: Buffer,
    readonly header: GffHeader,
    readonly labels: string[],
    readonly structs: GffStructEntry[]
  ) {}

  static fromBuffer(bytes: Buffer): GffView | null {
    try {
      const header = parseHeader(bytes);
      if (!header) {
        return null;
      }
      const labels = parseLabels(bytes, header);
      const structs = parseStructs(bytes, header);
      if (structs.length === 0) {
        return null;
      }
      return new GffView(bytes, header, labels, structs);
    } catch {
      return null;
    }
  }

  getStructFields(structIndex: number): Map<string, GffFieldRef> {
    if (structIndex < 0 || structIndex >= this.structs.length) {
      return new Map();
    }

    const struct = this.structs[structIndex];
    const indices = resolveStructFieldIndices(this.bytes, this.header, struct);
    if (!indices) {
      return new Map();
    }

    const fields = new Map<string, GffFieldRef>();
    for (const fieldIndex of indices) {
      if (fieldIndex < 0 || fieldIndex >= this.header.fieldCount) {
        continue;
      }
      const fieldOffset = this.header.fieldOffset + fieldIndex * GFF_FIELD_ENTRY_SIZE_BYTES;
      const typeId = this.bytes.readUInt32LE(fieldOffset);
      const labelIndex = this.bytes.readUInt32LE(fieldOffset + 4);
      const dataOrOffset = this.bytes.readUInt32LE(fieldOffset + 8);
      const label = normalizeLabel(this.labels[labelIndex] ?? `field_${labelIndex}`);
      if (!label) {
        continue;
      }
      fields.set(label, {
        typeId,
        dataOrOffset
      });
    }

    return fields;
  }

  readNumber(field: GffFieldRef | undefined): number | undefined {
    if (!field) {
      return undefined;
    }

    if (field.typeId === FIELD_TYPE.BYTE) {
      return field.dataOrOffset & 0xff;
    }
    if (field.typeId === FIELD_TYPE.CHAR) {
      // Signed 8-bit: sign-extend instead of masking to unsigned.
      return ((field.dataOrOffset & 0xff) << 24) >> 24;
    }
    if (field.typeId === FIELD_TYPE.WORD) {
      return field.dataOrOffset & 0xffff;
    }
    if (field.typeId === FIELD_TYPE.SHORT) {
      // Signed 16-bit: sign-extend instead of masking to unsigned.
      return ((field.dataOrOffset & 0xffff) << 16) >> 16;
    }
    if (field.typeId === FIELD_TYPE.DWORD) {
      // Unsigned 32-bit (e.g. Sun/Moon color DWORDs): `| 0` would flip values >= 2^31 negative.
      return field.dataOrOffset >>> 0;
    }
    if (field.typeId === FIELD_TYPE.INT) {
      return field.dataOrOffset | 0;
    }
    if (field.typeId === FIELD_TYPE.FLOAT) {
      const inline = Buffer.allocUnsafe(4);
      inline.writeUInt32LE(field.dataOrOffset, 0);
      return inline.readFloatLE(0);
    }

    return undefined;
  }

  readString(field: GffFieldRef | undefined): string | undefined {
    if (!field) {
      return undefined;
    }

    if (field.typeId === FIELD_TYPE.CEXOSTRING) {
      return readCExoString(this.bytes, this.header, field.dataOrOffset);
    }
    if (field.typeId === FIELD_TYPE.RESREF) {
      return readResRef(this.bytes, this.header, field.dataOrOffset);
    }
    if (field.typeId === FIELD_TYPE.CEXOLOCSTRING) {
      const loc = readCExoLocString(this.bytes, this.header, field.dataOrOffset);
      if (!loc) {
        return undefined;
      }
      return sanitizeUtf8(loc.text);
    }

    return undefined;
  }

  readLocString(field: GffFieldRef | undefined): ParsedCExoLocString | undefined {
    if (!field || field.typeId !== FIELD_TYPE.CEXOLOCSTRING) {
      return undefined;
    }
    return readCExoLocString(this.bytes, this.header, field.dataOrOffset);
  }

  readListStructIndices(field: GffFieldRef | undefined): number[] {
    if (!field || field.typeId !== FIELD_TYPE.LIST) {
      return [];
    }

    const offset = this.header.listIndicesOffset + field.dataOrOffset;
    if (!isRangeWithinBuffer(this.bytes, offset, 4)) {
      return [];
    }

    const count = this.bytes.readUInt32LE(offset);
    const bodyOffset = offset + 4;
    if (!isRangeWithinBuffer(this.bytes, bodyOffset, count * 4)) {
      return [];
    }

    const indices: number[] = [];
    for (let index = 0; index < count; index += 1) {
      indices.push(this.bytes.readUInt32LE(bodyOffset + index * 4));
    }
    return indices;
  }

  readStructIndex(field: GffFieldRef | undefined): number | undefined {
    if (!field || field.typeId !== FIELD_TYPE.STRUCT) {
      return undefined;
    }
    return field.dataOrOffset;
  }
}

export function parseAreaMetadataFromAreGff(
  bytes: Buffer
): ParsedAreaMetadataBlueprint | null {
  const view = GffView.fromBuffer(bytes);
  if (!view) {
    return null;
  }
  if (view.header.fileType.trim() !== "ARE") {
    return null;
  }

  const root = view.getStructFields(0);

  const name = readNameByAliases(view, root, ["name", "locname", "displayname"]);
  const tag = readStringByAliases(view, root, ["tag"]);
  const width = readNumberByAliases(view, root, ["width"]);
  const height = readNumberByAliases(view, root, ["height"]);
  const tileSet = readStringByAliases(view, root, ["tileset", "tilesetresref", "tilesetname"]);
  const tiles = parseAreaTileList(view, root, width);
  const tileCount = tiles.length;
  const globalLighting = parseAreaGlobalLightingFields(view, root);

  const soundIds: ParsedAreaSoundIds = {
    ambientDay: readNumberByAliases(view, root, ["ambientsndday", "ambientsoundday"]),
    ambientNight: readNumberByAliases(view, root, ["ambientsndnight", "ambientsoundnight"]),
    musicDay: readNumberByAliases(view, root, ["musicday"]),
    musicNight: readNumberByAliases(view, root, ["musicnight"]),
    musicBattle: readNumberByAliases(view, root, ["musicbattle"])
  };

  const dependencyFingerprint = createHash("sha256")
    .update(
      [
        name ?? "",
        tag ?? "",
        String(width ?? -1),
        String(height ?? -1),
        tileSet ?? "",
        String(tileCount ?? -1),
        ...tiles.map((tile) => stringifyAreaTile(tile)),
        ...globalLighting.fields.map((field) => `${field.field}:${field.value}`),
        String(soundIds.ambientDay ?? -1),
        String(soundIds.ambientNight ?? -1),
        String(soundIds.musicDay ?? -1),
        String(soundIds.musicNight ?? -1),
        String(soundIds.musicBattle ?? -1)
      ].join("|")
    )
    .digest("hex");

  return {
    sourceFileType: view.header.fileType,
    sourceFileVersion: view.header.fileVersion,
    sourceStructTypeId: view.structs[0]?.typeId ?? 0,
    name,
    tag,
    width,
    height,
    tileSet,
    tileCount,
    tiles,
    soundIds,
    globalLighting,
    dependencyFingerprint
  };
}

function parseAreaGlobalLightingFields(
  view: GffView,
  root: Map<string, GffFieldRef>
): ParsedAreaGlobalLightingBlueprint {
  const fields = AREA_GLOBAL_LIGHTING_FIELD_ALIASES.flatMap(({ field, aliases }) => {
    const value = readNumberByAliases(view, root, aliases);
    return Number.isFinite(value ?? Number.NaN) ? [{ field, value: value ?? 0 }] : [];
  });
  return { fields };
}

function parseAreaTileList(
  view: GffView,
  root: Map<string, GffFieldRef>,
  width: number | undefined
): ParsedAreaTileBlueprint[] {
  const listField = findFieldByAliases(root, ["tilelist"]);
  const structIndices = view.readListStructIndices(listField);
  const gridWidth = Number.isFinite(width ?? Number.NaN) && (width ?? 0) > 0 ? Math.floor(width ?? 0) : 0;
  return structIndices.map((structIndex, index) => {
    const fields = view.getStructFields(structIndex);
    const row = gridWidth > 0 ? Math.floor(index / gridWidth) : 0;
    const col = gridWidth > 0 ? index % gridWidth : index;
    const tileId = readNumberByAliases(view, fields, [
      "tileid",
      "tile_id",
      "id",
      "modelid",
      "model_id"
    ]);
    const orientation = readNumberByAliases(view, fields, [
      "orientation",
      "tileorientation",
      "tile_orientation",
      "rotation",
      "rotate"
    ]);
    const height = readNumberByAliases(view, fields, [
      "height",
      "tileheight",
      "tile_height",
      "z",
      "zposition"
    ]);
    const modelResRef = readStringByAliases(view, fields, [
      "modelresref",
      "model",
      "resref",
      "tileresref",
      "tile_resref"
    ]);
    const mainLight1 = readTileLightValueByAliases(view, fields, [
      "tilemainlight1",
      "tile_mainlight1",
      "mainlight1"
    ]);
    const mainLight2 = readTileLightValueByAliases(view, fields, [
      "tilemainlight2",
      "tile_mainlight2",
      "mainlight2"
    ]);
    const sourceLight1 = readTileLightValueByAliases(view, fields, [
      "tilesrclight1",
      "tile_srclight1",
      "sourcesrclight1",
      "sourcelight1"
    ]);
    const sourceLight2 = readTileLightValueByAliases(view, fields, [
      "tilesrclight2",
      "tile_srclight2",
      "sourcesrclight2",
      "sourcelight2"
    ]);
    const animLoop1 = readTileLightValueByAliases(view, fields, [
      "tileanimloop1",
      "tile_animloop1",
      "animloop1"
    ]);
    const animLoop2 = readTileLightValueByAliases(view, fields, [
      "tileanimloop2",
      "tile_animloop2",
      "animloop2"
    ]);
    const animLoop3 = readTileLightValueByAliases(view, fields, [
      "tileanimloop3",
      "tile_animloop3",
      "animloop3"
    ]);
    return {
      index,
      row,
      col,
      ...(Number.isFinite(tileId ?? Number.NaN) ? { tileId: Math.trunc(tileId ?? 0) } : {}),
      ...(modelResRef ? { modelResRef } : {}),
      ...(Number.isFinite(orientation ?? Number.NaN) ? { orientation: normalizeTileOrientation(orientation ?? 0) } : {}),
      ...(Number.isFinite(height ?? Number.NaN) ? { height: clampNumber(height ?? 0) } : {}),
      ...optionalTileNumber("mainLight1", mainLight1),
      ...optionalTileNumber("mainLight2", mainLight2),
      ...optionalTileNumber("sourceLight1", sourceLight1),
      ...optionalTileNumber("sourceLight2", sourceLight2),
      ...optionalTileNumber("animLoop1", animLoop1),
      ...optionalTileNumber("animLoop2", animLoop2),
      ...optionalTileNumber("animLoop3", animLoop3)
    };
  });
}

function readTileLightValueByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const value = readIntegerByAliases(view, fields, aliases);
  if (!Number.isFinite(value ?? Number.NaN)) {
    return undefined;
  }
  return Math.max(0, value ?? 0);
}

function optionalTileNumber<TKey extends string>(
  key: TKey,
  value: number | undefined
): { [K in TKey]?: number } {
  return value === undefined ? {} : { [key]: value } as { [K in TKey]?: number };
}

function stringifyAreaTile(tile: ParsedAreaTileBlueprint): string {
  return [
    tile.index,
    tile.row,
    tile.col,
    tile.tileId ?? "",
    tile.modelResRef ?? "",
    tile.orientation ?? "",
    tile.height ?? "",
    tile.mainLight1 ?? "",
    tile.mainLight2 ?? "",
    tile.sourceLight1 ?? "",
    tile.sourceLight2 ?? "",
    tile.animLoop1 ?? "",
    tile.animLoop2 ?? "",
    tile.animLoop3 ?? ""
  ].join(":");
}

function normalizeTileOrientation(value: number): number {
  const numeric = Math.trunc(value);
  return ((numeric % 4) + 4) % 4;
}

export function parseAreaObjectsFromGitGff(
  bytes: Buffer
): ParsedAreaObjectBlueprint | null {
  const view = GffView.fromBuffer(bytes);
  if (!view) {
    return null;
  }
  if (view.header.fileType.trim() !== "GIT") {
    return null;
  }

  const root = view.getStructFields(0);

  const soundIds = parseGitAreaProperties(view, root);
  const placeables = parsePlacementList(view, root, ["placeablelist"], "placeable");
  const doors = parsePlacementList(view, root, ["doorlist"], "door");
  const creatures = parsePlacementList(view, root, ["creaturelist"], "creature");
  const encounters = parsePlacementList(view, root, ["encounterlist"], "encounter");
  const items = parsePlacementList(view, root, ["itemlist", "list"], "item");
  const sounds = parsePlacementList(view, root, ["soundlist"], "sound");
  const stores = parsePlacementList(view, root, ["storelist"], "store");
  const triggers = parsePlacementList(view, root, ["triggerlist"], "trigger");
  const waypoints = parsePlacementList(view, root, ["waypointlist"], "waypoint");

  const dependencyFingerprint = createHash("sha256")
    .update(
      [
        stringifyAreaSoundIds(soundIds),
        ...placeables.map((entry) => stringifyPlacement(entry)),
        ...doors.map((entry) => stringifyPlacement(entry)),
        ...creatures.map((entry) => stringifyPlacement(entry)),
        ...encounters.map((entry) => stringifyPlacement(entry)),
        ...items.map((entry) => stringifyPlacement(entry)),
        ...sounds.map((entry) => stringifyPlacement(entry)),
        ...stores.map((entry) => stringifyPlacement(entry)),
        ...triggers.map((entry) => stringifyPlacement(entry)),
        ...waypoints.map((entry) => stringifyPlacement(entry))
      ].join("|")
    )
    .digest("hex");

  return {
    sourceFileType: view.header.fileType,
    sourceFileVersion: view.header.fileVersion,
    sourceStructTypeId: view.structs[0]?.typeId ?? 0,
    soundIds,
    placeables,
    doors,
    creatures,
    encounters,
    items,
    sounds,
    stores,
    triggers,
    waypoints,
    dependencyFingerprint
  };
}

const AURORA_DEFAULT_AMBIENT_SOUND_VOLUME = 0x7f;

/**
 * Reads area audio settings from the GIT root `AreaProperties` struct.
 * Aurora stores AmbientSnd and Music fields only here (never in the .are
 * file) and defaults both ambient volumes to 127 when absent.
 */
function parseGitAreaProperties(
  view: GffView,
  root: Map<string, GffFieldRef>
): ParsedAreaSoundIds {
  const structIndex = view.readStructIndex(findFieldByAliases(root, ["areaproperties"]));
  if (structIndex === undefined) {
    return {};
  }
  const fields = view.getStructFields(structIndex);
  const soundIds: ParsedAreaSoundIds = {
    ambientDay: readNumberByAliases(view, fields, ["ambientsndday"]),
    ambientNight: readNumberByAliases(view, fields, ["ambientsndnight"]),
    ambientDayVolume:
      readNumberByAliases(view, fields, ["ambientsnddayvol"]) ??
      AURORA_DEFAULT_AMBIENT_SOUND_VOLUME,
    ambientNightVolume:
      readNumberByAliases(view, fields, ["ambientsndnitvol"]) ??
      AURORA_DEFAULT_AMBIENT_SOUND_VOLUME,
    envAudio: readNumberByAliases(view, fields, ["envaudio"]),
    musicDay: readNumberByAliases(view, fields, ["musicday"]),
    musicNight: readNumberByAliases(view, fields, ["musicnight"]),
    musicBattle: readNumberByAliases(view, fields, ["musicbattle"]),
    musicDelay: readNumberByAliases(view, fields, ["musicdelay"])
  };
  for (const key of Object.keys(soundIds) as Array<keyof ParsedAreaSoundIds>) {
    if (soundIds[key] === undefined) {
      delete soundIds[key];
    }
  }
  return soundIds;
}

function stringifyAreaSoundIds(soundIds: ParsedAreaSoundIds): string {
  return [
    soundIds.ambientDay ?? "",
    soundIds.ambientNight ?? "",
    soundIds.ambientDayVolume ?? "",
    soundIds.ambientNightVolume ?? "",
    soundIds.envAudio ?? "",
    soundIds.musicDay ?? "",
    soundIds.musicNight ?? "",
    soundIds.musicBattle ?? "",
    soundIds.musicDelay ?? ""
  ].join(":");
}

function parsePlacementList(
  view: GffView,
  root: Map<string, GffFieldRef>,
  aliases: readonly string[],
  kind: ParsedAreaPlacementBlueprint["listKind"]
): ParsedAreaPlacementBlueprint[] {
  const listField = findFieldByAliases(root, aliases);
  const structIndices = view.readListStructIndices(listField);
  const placements: ParsedAreaPlacementBlueprint[] = [];

  for (const structIndex of structIndices) {
    const fields = view.getStructFields(structIndex);

    const positionStructIndex = view.readStructIndex(
      findFieldByAliases(fields, ["position", "location"])
    );
    const positionStruct =
      positionStructIndex === undefined ? new Map<string, GffFieldRef>() : view.getStructFields(positionStructIndex);

    let x =
      readNumberByAliases(view, fields, ["xposition", "x", "xpos"]) ??
      readNumberByAliases(view, positionStruct, ["x"]);
    let y =
      readNumberByAliases(view, fields, ["yposition", "y", "ypos"]) ??
      readNumberByAliases(view, positionStruct, ["y"]);
    let z =
      readNumberByAliases(view, fields, ["zposition", "z", "zpos"]) ??
      readNumberByAliases(view, positionStruct, ["z"]);
    if ((x === undefined || y === undefined || z === undefined) && kind === "trigger") {
      const geometryCenter = readTriggerGeometryCenter(view, fields);
      x = x ?? geometryCenter?.x;
      y = y ?? geometryCenter?.y;
      z = z ?? geometryCenter?.z;
    }
    z = z ?? 0;

    const xOrientation =
      readNumberByAliases(view, fields, ["xorientation"]) ??
      readNumberByAliases(view, positionStruct, ["xorientation"]);
    const yOrientation =
      readNumberByAliases(view, fields, ["yorientation"]) ??
      readNumberByAliases(view, positionStruct, ["yorientation"]);

    const explicitBearingRadians = readNumberByAliases(view, fields, ["bearing", "facing", "orientation"]);
    const derivedBearing =
      (explicitBearingRadians !== undefined
        ? deriveBearingFromRadians(explicitBearingRadians)
        : undefined) ??
      deriveBearingFromOrientation(xOrientation, yOrientation) ??
      0;

    const templateResRef = readStringByAliases(view, fields, [
      "templateresref",
      "resref",
      "template",
      "sound",
      "soundresref"
    ]);
    const tag = readStringByAliases(view, fields, ["tag"]);
    const localizedNameInfo = readNameInfoByAliases(view, fields, [
      "locname",
      "localizedname",
      "name"
    ]);
    const localizedName = localizedNameInfo.text;
    const description =
      readNameByAliases(view, fields, ["description", "identifieddescription", "desc"]) ??
      readAlternateLocalizedNameEntry(localizedNameInfo, localizedName);
    const appearanceType =
      kind === "placeable" || kind === "door" || kind === "creature"
        ? readIntegerByAliases(view, fields, ["appearance", "appearancetype", "appearanceid"])
        : undefined;
    const useable =
      kind === "placeable" ? readBooleanByAliases(view, fields, ["useable"]) : undefined;
    const isStatic =
      kind === "placeable"
        ? (readBooleanByAliases(view, fields, ["static"]) ??
          (useable !== undefined ? !useable : undefined))
        : undefined;
    const genericType =
      kind === "door" ? readIntegerByAliases(view, fields, ["generictype", "genericappearance"]) : undefined;
    const soundPositioning =
      kind === "sound" ? parseSoundPositioning(view, fields, clampNumber(z)) : undefined;
    const doorTransition =
      kind === "door" ? parseDoorTransition(view, fields) : undefined;
    const creatureMetadata =
      kind === "creature"
        ? buildCreatureMetadata(view, fields, templateResRef, tag, appearanceType)
        : undefined;
    const itemMetadata =
      kind === "item" ? buildItemMetadata(view, fields, templateResRef, tag) : undefined;
    const visualTransform = parseVisualTransform(view, fields);

    if (!Number.isFinite(x ?? Number.NaN) || !Number.isFinite(y ?? Number.NaN)) {
      continue;
    }

    placements.push({
      listKind: kind,
      templateResRef,
      tag,
      ...(localizedName ? { localizedName } : {}),
      ...(description ? { description } : {}),
      ...(appearanceType !== undefined ? { appearanceType } : {}),
      ...(genericType !== undefined ? { genericType } : {}),
      ...(isStatic !== undefined ? { isStatic } : {}),
      ...(creatureMetadata ? { creatureMetadata } : {}),
      ...(itemMetadata ? { itemMetadata } : {}),
      x: clampNumber(x ?? 0),
      y: clampNumber(y ?? 0),
      z: clampNumber(z),
      bearing: normalizeBearing(derivedBearing),
      ...(visualTransform ? { visualTransform } : {}),
      ...(soundPositioning ? { soundPositioning } : {}),
      ...(doorTransition ? { doorTransition } : {})
    });
  }

  return placements;
}

function readTriggerGeometryCenter(
  view: GffView,
  fields: Map<string, GffFieldRef>
): { x: number; y: number; z: number } | undefined {
  const structIndices = readListStructIndicesByAliases(view, fields, ["geometry"]);
  const points: Array<{ x: number; y: number; z: number }> = [];
  for (const structIndex of structIndices) {
    const pointFields = view.getStructFields(structIndex);
    const x = readNumberByAliases(view, pointFields, ["pointx", "x"]);
    const y = readNumberByAliases(view, pointFields, ["pointy", "y"]);
    const z = readNumberByAliases(view, pointFields, ["pointz", "z"]) ?? 0;
    if (Number.isFinite(x ?? Number.NaN) && Number.isFinite(y ?? Number.NaN)) {
      points.push({ x: x ?? 0, y: y ?? 0, z });
    }
  }
  if (points.length === 0) {
    return undefined;
  }
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    z: points.reduce((sum, point) => sum + point.z, 0) / points.length
  };
}

const CREATURE_STRING_METADATA_FIELDS = [
  { key: "templateResRef", aliases: ["templateresref", "resref", "template"] },
  { key: "tag", aliases: ["tag"] },
  { key: "conversation", aliases: ["conversation", "conv"] },
  { key: "portraitResRef", aliases: ["portrait"] }
] as const;

const CREATURE_LOCALIZED_METADATA_FIELDS = [
  { key: "firstName", strRefKey: "firstNameStrRef", aliases: ["firstname"] },
  { key: "lastName", strRefKey: "lastNameStrRef", aliases: ["lastname"] },
  { key: "description", strRefKey: "descriptionStrRef", aliases: ["description", "desc"] },
  { key: "comments", aliases: ["comment", "comments"] },
  { key: "subrace", strRefKey: "subraceStrRef", aliases: ["subrace"] },
  { key: "deity", strRefKey: "deityStrRef", aliases: ["deity"] }
] as const;

const CREATURE_NUMBER_METADATA_FIELDS = [
  { key: "paletteId", aliases: ["paletteid"] },
  { key: "appearanceId", aliases: ["appearance", "appearancetype", "appearanceid"] },
  { key: "gender", aliases: ["gender"] },
  { key: "race", aliases: ["race"] },
  { key: "phenotype", aliases: ["phenotype"] },
  { key: "factionId", aliases: ["factionid", "faction"] },
  { key: "portraitId", aliases: ["portraitid"] },
  { key: "soundSetFile", aliases: ["soundsetfile"] },
  { key: "wingsNew", aliases: ["wingsnew", "wings"] },
  { key: "tailNew", aliases: ["tailnew", "tail"] },
  { key: "walkRate", aliases: ["walkrate"] },
  { key: "naturalAc", aliases: ["naturalac"] },
  { key: "decayTime", aliases: ["decaytime"] },
  { key: "hitPoints", aliases: ["hitpoints", "hp"] },
  { key: "currentHitPoints", aliases: ["currenthitpoints", "currenthp"] },
  { key: "maxHitPoints", aliases: ["maxhitpoints"] },
  { key: "reflexBonus", aliases: ["refbonus", "refsave"] },
  { key: "willBonus", aliases: ["willbonus", "willsave"] },
  { key: "fortitudeBonus", aliases: ["fortbonus", "fortsave"] },
  { key: "goodEvil", aliases: ["goodevil"] },
  { key: "lawfulChaotic", aliases: ["lawfulchaotic"] },
  { key: "challengeRating", aliases: ["challengerating"] },
  { key: "crAdjust", aliases: ["cradjust"] },
  { key: "perceptionRange", aliases: ["perceptionrange"] },
  { key: "strength", aliases: ["str", "strength"] },
  { key: "dexterity", aliases: ["dex", "dexterity"] },
  { key: "constitution", aliases: ["con", "constitution"] },
  { key: "intelligence", aliases: ["int", "intelligence"] },
  { key: "wisdom", aliases: ["wis", "wisdom"] },
  { key: "charisma", aliases: ["cha", "charisma"] },
  { key: "strengthAdjust", aliases: ["stradjust", "strengthadjust"] },
  { key: "dexterityAdjust", aliases: ["dexadjust", "dexterityadjust"] },
  { key: "constitutionAdjust", aliases: ["conadjust", "constitutionadjust"] },
  { key: "intelligenceAdjust", aliases: ["intadjust", "intelligenceadjust"] },
  { key: "wisdomAdjust", aliases: ["wisadjust", "wisdomadjust"] },
  { key: "charismaAdjust", aliases: ["chaadjust", "charismaadjust"] },
  { key: "appearanceHead", aliases: ["appearancehead", "appearance_head"] },
  { key: "bodyPartRFoot", aliases: ["bodypartrfoot", "armorpartrfoot"] },
  { key: "bodyPartLFoot", aliases: ["bodypartlfoot", "armorpartlfoot"] },
  { key: "bodyPartRShin", aliases: ["bodypartrshin", "armorpartrshin"] },
  { key: "bodyPartLShin", aliases: ["bodypartlshin", "armorpartlshin"] },
  { key: "bodyPartLThigh", aliases: ["bodypartlthigh", "armorpartlthigh"] },
  { key: "bodyPartRThigh", aliases: ["bodypartrthigh", "armorpartrthigh"] },
  { key: "bodyPartPelvis", aliases: ["bodypartpelvis", "armorpartpelvis"] },
  { key: "bodyPartTorso", aliases: ["bodyparttorso", "armorparttorso"] },
  { key: "bodyPartBelt", aliases: ["bodypartbelt", "armorpartbelt"] },
  { key: "bodyPartNeck", aliases: ["bodypartneck", "armorpartneck"] },
  { key: "bodyPartRFArm", aliases: ["bodypartrfarm", "armorpartrfarm"] },
  { key: "bodyPartLFArm", aliases: ["bodypartlfarm", "armorpartlfarm"] },
  { key: "bodyPartRBicep", aliases: ["bodypartrbicep", "armorpartrbicep"] },
  { key: "bodyPartLBicep", aliases: ["bodypartlbicep", "armorpartlbicep"] },
  { key: "bodyPartRShoul", aliases: ["bodypartrshoul", "armorpartrshoul"] },
  { key: "bodyPartLShoul", aliases: ["bodypartlshoul", "armorpartlshoul"] },
  { key: "bodyPartRHand", aliases: ["bodypartrhand", "armorpartrhand"] },
  { key: "bodyPartLHand", aliases: ["bodypartlhand", "armorpartlhand"] },
  { key: "bodyPartRobe", aliases: ["bodypartrobe", "armorpartrobe"] },
  { key: "colorSkin", aliases: ["colorskin"] },
  { key: "colorHair", aliases: ["colorhair"] },
  { key: "colorTattoo1", aliases: ["colortattoo1"] },
  { key: "colorTattoo2", aliases: ["colortattoo2"] }
] as const;

const CREATURE_BOOLEAN_METADATA_FIELDS = [
  { key: "plot", aliases: ["plot"] },
  { key: "disarmable", aliases: ["disarmable"] },
  { key: "isPc", aliases: ["ispc"] },
  { key: "isImmortal", aliases: ["isimmortal"] },
  { key: "interruptable", aliases: ["interruptable", "interruptible"] },
  { key: "lootable", aliases: ["lootable"] },
  { key: "noPermDeath", aliases: ["nopermdeath"] },
  { key: "bodyBag", aliases: ["bodybag"] },
  { key: "startingPackage", aliases: ["startingpackage"] }
] as const;

const CREATURE_SCRIPT_METADATA_FIELDS = [
  { key: "script.scriptheartbeat", aliases: ["scriptheartbeat", "onheartbeat"] },
  { key: "script.scriptonnotice", aliases: ["scriptonnotice"] },
  { key: "script.scriptspellat", aliases: ["scriptspellat", "onspellcastat"] },
  { key: "script.scriptattacked", aliases: ["scriptattacked", "onmeleeattacked"] },
  { key: "script.scriptdamaged", aliases: ["scriptdamaged", "ondamaged"] },
  {
    key: "script.scriptdisturbed",
    aliases: ["scriptdisturbed", "oninventorydisturbed", "oninvdisturbed"]
  },
  { key: "script.scriptendround", aliases: ["scriptendround"] },
  { key: "script.scriptdialogue", aliases: ["scriptdialogue", "ondialog"] },
  { key: "script.scriptspawn", aliases: ["scriptspawn"] },
  { key: "script.scriptrested", aliases: ["scriptrested"] },
  { key: "script.scriptdeath", aliases: ["scriptdeath", "ondeath"] },
  { key: "script.scriptuserdefine", aliases: ["scriptuserdefine", "onuserdefined"] },
  { key: "script.scriptonblocked", aliases: ["scriptonblocked"] }
] as const;

const ITEM_NUMBER_METADATA_FIELDS = [
  { key: "baseItem", aliases: ["baseitem"] },
  { key: "modelPart1", aliases: ["modelpart1"] },
  { key: "modelPart2", aliases: ["modelpart2"] },
  { key: "modelPart3", aliases: ["modelpart3"] },
  { key: "cost", aliases: ["cost"] },
  { key: "addCost", aliases: ["addcost"] },
  { key: "costTable", aliases: ["costtable"] },
  { key: "costValue", aliases: ["costvalue"] },
  { key: "charges", aliases: ["charges"] },
  { key: "stackSize", aliases: ["stacksize"] },
  { key: "paletteId", aliases: ["paletteid"] },
  { key: "bodyPartRFoot", aliases: ["armorpart_rfoot", "bodypartrfoot"] },
  { key: "bodyPartLFoot", aliases: ["armorpart_lfoot", "bodypartlfoot"] },
  { key: "bodyPartRShin", aliases: ["armorpart_rshin", "bodypartrshin"] },
  { key: "bodyPartLShin", aliases: ["armorpart_lshin", "bodypartlshin"] },
  { key: "bodyPartLThigh", aliases: ["armorpart_lthigh", "bodypartlthigh"] },
  { key: "bodyPartRThigh", aliases: ["armorpart_rthigh", "bodypartrthigh"] },
  { key: "bodyPartPelvis", aliases: ["armorpart_pelvis", "bodypartpelvis"] },
  { key: "bodyPartTorso", aliases: ["armorpart_torso", "bodyparttorso"] },
  { key: "bodyPartBelt", aliases: ["armorpart_belt", "bodypartbelt"] },
  { key: "bodyPartNeck", aliases: ["armorpart_neck", "bodypartneck"] },
  { key: "bodyPartRFArm", aliases: ["armorpart_rfarm", "bodypartrfarm"] },
  { key: "bodyPartLFArm", aliases: ["armorpart_lfarm", "bodypartlfarm"] },
  { key: "bodyPartRBicep", aliases: ["armorpart_rbicep", "bodypartrbicep"] },
  { key: "bodyPartLBicep", aliases: ["armorpart_lbicep", "bodypartlbicep"] },
  { key: "bodyPartRShoul", aliases: ["armorpart_rshoul", "bodypartrshoul"] },
  { key: "bodyPartLShoul", aliases: ["armorpart_lshoul", "bodypartlshoul"] },
  { key: "bodyPartRHand", aliases: ["armorpart_rhand", "bodypartrhand"] },
  { key: "bodyPartLHand", aliases: ["armorpart_lhand", "bodypartlhand"] },
  { key: "bodyPartRobe", aliases: ["armorpart_robe", "bodypartrobe"] },
  { key: "leather1Color", aliases: ["leather1color"] },
  { key: "leather2Color", aliases: ["leather2color"] },
  { key: "cloth1Color", aliases: ["cloth1color"] },
  { key: "cloth2Color", aliases: ["cloth2color"] },
  { key: "metal1Color", aliases: ["metal1color"] },
  { key: "metal2Color", aliases: ["metal2color"] }
] as const;

const ITEM_BOOLEAN_METADATA_FIELDS = [
  { key: "identified", aliases: ["identified"] },
  { key: "stolen", aliases: ["stolen"] },
  { key: "plot", aliases: ["plot"] },
  { key: "cursed", aliases: ["cursed"] }
] as const;

const ITEM_SCRIPT_METADATA_FIELDS = [
  { key: "script.onused", aliases: ["onused"] },
  { key: "script.onheartbeat", aliases: ["onheartbeat"] },
  { key: "script.onuserdefined", aliases: ["onuserdefined"] },
  { key: "script.oninventorydisturbed", aliases: ["oninventorydisturbed", "oninvdisturbed"] }
] as const;

function buildItemMetadata(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  templateResRef: string | undefined,
  tag: string | undefined
): Record<string, ParsedAreaObjectMetadataPrimitive> | undefined {
  const metadata: Record<string, ParsedAreaObjectMetadataPrimitive> = {};
  addStringMetadata(metadata, "templateResRef", templateResRef);
  addStringMetadata(metadata, "tag", tag);
  addStringMetadata(metadata, "comments", readStringByAliases(view, fields, ["comment", "comments"]));

  const localizedNameInfo = readNameInfoByAliases(view, fields, ["locname", "localizedname", "name"]);
  addStringMetadata(metadata, "localizedName", localizedNameInfo.text);
  addNumberMetadata(metadata, "localizedNameStrRef", localizedNameInfo.strRef);
  const descriptionInfo = readNameInfoByAliases(view, fields, ["description", "desc"]);
  addStringMetadata(metadata, "description", descriptionInfo.text);
  addNumberMetadata(metadata, "descriptionStrRef", descriptionInfo.strRef);
  const identifiedDescriptionInfo = readNameInfoByAliases(view, fields, [
    "descidentified",
    "identifieddescription"
  ]);
  addStringMetadata(metadata, "identifiedDescription", identifiedDescriptionInfo.text);
  addNumberMetadata(metadata, "identifiedDescriptionStrRef", identifiedDescriptionInfo.strRef);

  for (const field of ITEM_NUMBER_METADATA_FIELDS) {
    addNumberMetadata(metadata, field.key, readNumberByAliases(view, fields, field.aliases));
  }
  for (const field of ITEM_BOOLEAN_METADATA_FIELDS) {
    addBooleanMetadata(metadata, field.key, readBooleanByAliases(view, fields, field.aliases));
  }
  for (const field of ITEM_SCRIPT_METADATA_FIELDS) {
    addStringMetadata(metadata, field.key, readStringByAliases(view, fields, field.aliases));
  }

  const itemPropertyListEntries = readItemPropertyListEntries(view, fields);
  addNumberMetadata(metadata, "itemPropertyListCount", itemPropertyListEntries.length);
  addJsonMetadata(metadata, "itemPropertyListEntries", itemPropertyListEntries);

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function buildCreatureMetadata(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  templateResRef: string | undefined,
  tag: string | undefined,
  appearanceType: number | undefined
): Record<string, ParsedAreaCreatureMetadataPrimitive> | undefined {
  const metadata: Record<string, ParsedAreaCreatureMetadataPrimitive> = {};

  addStringMetadata(metadata, "templateResRef", templateResRef);
  addStringMetadata(metadata, "tag", tag);
  addNumberMetadata(metadata, "appearanceId", appearanceType);

  for (const field of CREATURE_STRING_METADATA_FIELDS) {
    addStringMetadata(metadata, field.key, readStringByAliases(view, fields, field.aliases));
  }
  for (const field of CREATURE_LOCALIZED_METADATA_FIELDS) {
    const nameInfo = readNameInfoByAliases(view, fields, field.aliases);
    addStringMetadata(metadata, field.key, nameInfo.text);
    if ("strRefKey" in field) {
      addNumberMetadata(metadata, field.strRefKey, nameInfo.strRef);
    }
  }
  for (const field of CREATURE_NUMBER_METADATA_FIELDS) {
    addNumberMetadata(metadata, field.key, readNumberByAliases(view, fields, field.aliases));
  }
  for (const field of CREATURE_BOOLEAN_METADATA_FIELDS) {
    addBooleanMetadata(metadata, field.key, readBooleanByAliases(view, fields, field.aliases));
  }
  for (const field of CREATURE_SCRIPT_METADATA_FIELDS) {
    addStringMetadata(metadata, field.key, readStringByAliases(view, fields, field.aliases));
  }

  const classListCount = readListCountByAliases(view, fields, ["classlist"]);
  const skillListCount = readListCountByAliases(view, fields, ["skilllist"]);
  const featListCount = readListCountByAliases(view, fields, ["featlist"]);
  const templateListCount = readListCountByAliases(view, fields, ["templatelist"]);
  const specAbilityListCount = readListCountByAliases(view, fields, ["specabilitylist"]);
  const inventoryItemListCount = readListCountByAliases(view, fields, ["itemlist"]);
  const equipItemListCount = readListCountByAliases(view, fields, [
    "equipitemlist",
    "equip_itemlist"
  ]);

  addNumberMetadata(metadata, "classListCount", classListCount);
  addNumberMetadata(metadata, "skillListCount", skillListCount);
  addNumberMetadata(metadata, "featListCount", featListCount);
  addNumberMetadata(metadata, "templateListCount", templateListCount);
  addNumberMetadata(metadata, "specAbilityListCount", specAbilityListCount);
  addNumberMetadata(metadata, "inventoryItemListCount", inventoryItemListCount);
  addNumberMetadata(metadata, "equipItemListCount", equipItemListCount);

  addJsonMetadata(metadata, "classListEntries", readCreatureClassListEntries(view, fields));
  addJsonMetadata(metadata, "skillListEntries", readCreatureSkillListEntries(view, fields));
  addJsonMetadata(
    metadata,
    "featListEntries",
    readCreatureIdListEntries(view, fields, ["featlist"], ["feat", "featid"])
  );
  addJsonMetadata(
    metadata,
    "templateListEntries",
    readCreatureIdListEntries(view, fields, ["templatelist"], ["templateid"]).map((entry) => ({
      templateId: entry.featId
    }))
  );
  addJsonMetadata(metadata, "specAbilityListEntries", readCreatureSpecAbilityListEntries(view, fields));
  addJsonMetadata(
    metadata,
    "inventoryItemListEntries",
    readCreatureInventoryItemListEntries(view, fields)
  );
  addJsonMetadata(
    metadata,
    "equipItemListEntries",
    readCreatureEquipItemListEntries(view, fields)
  );

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function addStringMetadata(
  metadata: Record<string, ParsedAreaCreatureMetadataPrimitive>,
  key: string,
  value: string | undefined
): void {
  if (value && value.trim().length > 0) {
    metadata[key] = value.trim();
  }
}

function addNumberMetadata(
  metadata: Record<string, ParsedAreaCreatureMetadataPrimitive>,
  key: string,
  value: number | undefined
): void {
  if (Number.isFinite(value ?? Number.NaN)) {
    metadata[key] = clampNumber(value ?? 0);
  }
}

function addBooleanMetadata(
  metadata: Record<string, ParsedAreaCreatureMetadataPrimitive>,
  key: string,
  value: boolean | undefined
): void {
  if (value !== undefined) {
    metadata[key] = value;
  }
}

function addJsonMetadata(
  metadata: Record<string, ParsedAreaCreatureMetadataPrimitive>,
  key: string,
  entries: readonly object[]
): void {
  if (entries.length > 0) {
    metadata[key] = JSON.stringify(entries);
  }
}

function readCreatureClassListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaCreatureClassListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, ["classlist"]);
  return structIndices.map((structIndex) => {
    const entryFields = view.getStructFields(structIndex);
    const rawClassId = readNumberByAliases(view, entryFields, ["class"]);
    const rawLevel = readNumberByAliases(view, entryFields, ["classlevel"]);
    const classId = normalizeListNumber(rawClassId, 0);
    const level = normalizeListNumber(rawLevel, 0);
    const shouldReadKnownSpells = classId === 1 || classId === 9;
    const knownSpells = shouldReadKnownSpells
      ? [
          ...readCreatureClassSpellListEntries(view, entryFields, ["knownlist"]),
          ...readLeveledCreatureClassSpellListEntries(view, entryFields, "knownlist")
        ]
      : [];
    const memorizedSpells = [
      ...readCreatureClassSpellListEntries(view, entryFields, ["memorizedlist"]),
      ...readLeveledCreatureClassSpellListEntries(view, entryFields, "memorizedlist")
    ];
    return {
      classId,
      level,
      knownSpellCount: knownSpells.length > 0 ? knownSpells.length : undefined,
      memorizedSpellCount: memorizedSpells.length > 0 ? memorizedSpells.length : undefined,
      knownSpells: knownSpells.length > 0 ? knownSpells : undefined,
      memorizedSpells: memorizedSpells.length > 0 ? memorizedSpells : undefined
    };
  });
}

function readCreatureClassSpellListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  listAliases: readonly string[]
): ParsedAreaCreatureSpellListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, listAliases);
  return structIndices.map((structIndex) => {
    const entryFields = view.getStructFields(structIndex);
    const spellId = readNumberByAliases(view, entryFields, ["spell"]);
    const metaMagic = readNumberByAliases(view, entryFields, ["spellmetamagic"]);
    const flags = readNumberByAliases(view, entryFields, ["spellflags"]);
    return {
      spellId: normalizeListNumber(spellId, 0),
      metaMagic: normalizeAuroraSpellMetaMagic(metaMagic),
      flags: normalizeAuroraSpellFlags(flags)
    };
  });
}

function readLeveledCreatureClassSpellListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  baseAlias: "knownlist" | "memorizedlist"
): ParsedAreaCreatureSpellListEntry[] {
  const entries: ParsedAreaCreatureSpellListEntry[] = [];
  for (let spellLevel = 0; spellLevel < 14; spellLevel += 1) {
    const levelEntries = readCreatureClassSpellListEntries(view, fields, [
      `${baseAlias}${spellLevel}`
    ]);
    for (const entry of levelEntries) {
      entries.push({
        ...entry,
        spellLevel
      });
    }
  }
  return entries;
}

function readCreatureSkillListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaCreatureSkillListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, ["skilllist"]);
  if (structIndices.length === 0 && !findFieldByAliases(fields, ["skilllist"])) {
    return [];
  }
  const entryCount = Math.max(AURORA_DEFAULT_CREATURE_SKILL_COUNT, structIndices.length);
  return Array.from({ length: entryCount }, (_, index) => {
    const structIndex = structIndices[index];
    const entryFields =
      structIndex === undefined ? new Map<string, GffFieldRef>() : view.getStructFields(structIndex);
    const rank = readNumberByAliases(view, entryFields, ["rank"]);
    return {
      skillId: index,
      rank: normalizeListNumber(rank, 0)
    };
  });
}

function readCreatureIdListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  listAliases: readonly string[],
  idAliases: readonly string[]
): ParsedAreaCreatureIdListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, listAliases);
  return structIndices.map((structIndex) => {
    const entryFields = view.getStructFields(structIndex);
    const featId = readNumberByAliases(view, entryFields, idAliases);
    return {
      featId: normalizeListNumber(featId, 0)
    };
  });
}

function readCreatureSpecAbilityListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaCreatureSpecAbilityListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, ["specabilitylist"]);
  return structIndices.map((structIndex) => {
    const entryFields = view.getStructFields(structIndex);
    const spellId = readNumberByAliases(view, entryFields, ["spell"]);
    const flags = readNumberByAliases(view, entryFields, ["spellflags"]);
    const casterLevel = readNumberByAliases(view, entryFields, ["spellcasterlevel"]);
    return {
      spellId: normalizeListNumber(spellId, 0),
      flags: normalizeAuroraSpellFlags(flags),
      casterLevel: normalizeAuroraSpecialAbilityCasterLevel(casterLevel)
    };
  });
}

function readCreatureInventoryItemListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaCreatureInventoryItemListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, ["itemlist"]);
  return structIndices.flatMap((structIndex) => {
    const entryFields = view.getStructFields(structIndex);
    const resRef = readStringByAliases(view, entryFields, ["inventoryres", "resref"]);
    if (!resRef) {
      return [];
    }
    const x = readNumberByAliases(view, entryFields, ["reposposx", "repos_posx"]);
    const y = readNumberByAliases(view, entryFields, ["reposposy", "repos_posy"]);
    return [{
      resRef,
      x: normalizeListNumber(x, 0),
      y: normalizeListNumber(y, 0),
      dropable: readBooleanByAliases(view, entryFields, ["dropable", "droppable"]) ?? false,
      pickpocketable: readBooleanByAliases(view, entryFields, ["pickpocketable"]) ?? false,
      infinite: readBooleanByAliases(view, entryFields, ["infinite"]) ?? false
    }];
  });
}

function readItemPropertyListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>
): Array<{
  propertyName?: number;
  subtype?: number;
  costTable?: number;
  costValue?: number;
  param1?: number;
  param1Value?: number;
  chanceAppear?: number;
}> {
  const structIndices = readListStructIndicesByAliases(view, fields, ["propertieslist"]);
  return structIndices
    .map((structIndex) => {
      const entryFields = view.getStructFields(structIndex);
      return {
        propertyName: readIntegerByAliases(view, entryFields, ["propertyname"]),
        subtype: readIntegerByAliases(view, entryFields, ["subtype"]),
        costTable: readIntegerByAliases(view, entryFields, ["costtable"]),
        costValue: readIntegerByAliases(view, entryFields, ["costvalue"]),
        param1: readIntegerByAliases(view, entryFields, ["param1"]),
        param1Value: readIntegerByAliases(view, entryFields, ["param1value"]),
        chanceAppear: readIntegerByAliases(view, entryFields, ["chanceappear"])
      };
    })
    .filter((entry) =>
      Object.values(entry).some((value) => Number.isFinite(value ?? Number.NaN))
    );
}

function readCreatureEquipItemListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaCreatureEquipItemListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, [
    "equipitemlist",
    "equip_itemlist"
  ]);
  return structIndices.flatMap((structIndex) => {
    const entryFields = view.getStructFields(structIndex);
    const resRef = readStringByAliases(view, entryFields, ["equippedres", "resref"]);
    if (!resRef) {
      return [];
    }
    return [{
      resRef,
      slotMask: normalizeListNumber(view.structs[structIndex]?.typeId, undefined),
      dropable: readBooleanByAliases(view, entryFields, ["dropable", "droppable"]) ?? false,
      pickpocketable: readBooleanByAliases(view, entryFields, ["pickpocketable"]) ?? false,
      infinite: readBooleanByAliases(view, entryFields, ["infinite"]) ?? false
    }];
  });
}

function parseVisualTransform(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaVisualTransformBlueprint | undefined {
  const transformStructIndices = [
    ...readListStructIndicesByAliases(view, fields, ["vistransformlist"]),
    ...readListStructIndicesByAliases(view, fields, ["visualtransformlist"])
  ];
  const transformStructFieldSets = transformStructIndices
    .map((structIndex) => view.getStructFields(structIndex))
    .filter((entry): entry is Map<string, GffFieldRef> => Boolean(entry));
  const transformFieldsFromList =
    transformStructFieldSets.find(
      (entry) =>
        (readNumberByAliases(view, entry, ["scope"]) ??
          AURORA_VISUAL_TRANSFORM_BASE_SCOPE) === AURORA_VISUAL_TRANSFORM_BASE_SCOPE
    ) ?? transformStructFieldSets[0];
  const visualTransformStructIndex =
    transformFieldsFromList === undefined
      ? view.readStructIndex(findFieldByAliases(fields, ["visualtransform"]))
      : undefined;
  const transformFields =
    transformFieldsFromList !== undefined
      ? transformFieldsFromList
      : visualTransformStructIndex !== undefined
        ? view.getStructFields(visualTransformStructIndex)
        : undefined;

  if (!transformFields) {
    return undefined;
  }

  const transform = {
    scaleX: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["scalex"]) ?? 1
    ),
    scaleY: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["scaley"]) ?? 1
    ),
    scaleZ: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["scalez"]) ?? 1
    ),
    rotateX: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["rotatex"]) ?? 0
    ),
    rotateY: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["rotatey"]) ?? 0
    ),
    rotateZ: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["rotatez"]) ?? 0
    ),
    translateX: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["translatex"]) ?? 0
    ),
    translateY: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["translatey"]) ?? 0
    ),
    translateZ: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["translatez"]) ?? 0
    )
  };

  const isDefault =
    transform.scaleX === 1 &&
    transform.scaleY === 1 &&
    transform.scaleZ === 1 &&
    transform.rotateX === 0 &&
    transform.rotateY === 0 &&
    transform.rotateZ === 0 &&
    transform.translateX === 0 &&
    transform.translateY === 0 &&
    transform.translateZ === 0;

  return isDefault ? undefined : transform;
}

function readVisualTransformControllerValue(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const field = findFieldByAliases(fields, aliases);
  if (!field) {
    return undefined;
  }
  if (field.typeId === FIELD_TYPE.STRUCT) {
    const controllerFields = view.getStructFields(field.dataOrOffset);
    return (
      readNumberByAliases(view, controllerFields, ["valueto"]) ??
      readNumberByAliases(view, controllerFields, ["valuefrom"]) ??
      readNumberByAliases(view, controllerFields, ["value"])
    );
  }
  return view.readNumber(field);
}

function readListStructIndicesByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number[] {
  return view.readListStructIndices(findFieldByAliases(fields, aliases));
}

function normalizeListNumber(
  value: number | undefined,
  fallback: number | undefined
): number | undefined {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(value ?? 0));
}

function normalizeAuroraSpellMetaMagic(value: number | undefined): number {
  return normalizeListNumber(value, AURORA_DEFAULT_SPELL_META_MAGIC) ?? AURORA_DEFAULT_SPELL_META_MAGIC;
}

function normalizeAuroraSpellFlags(value: number | undefined): number {
  const source = normalizeListNumber(value, 0) ?? 0;
  return source | AURORA_SPELL_FLAGS_RUNTIME_BIT;
}

function normalizeAuroraSpecialAbilityCasterLevel(value: number | undefined): number {
  const source =
    normalizeListNumber(value, AURORA_DEFAULT_SPECIAL_ABILITY_CASTER_LEVEL) ??
    AURORA_DEFAULT_SPECIAL_ABILITY_CASTER_LEVEL;
  return Math.min(source, AURORA_MAX_SPECIAL_ABILITY_CASTER_LEVEL);
}

function parseDoorTransition(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaDoorTransitionBlueprint | undefined {
  const linkedTarget = readStringByAliases(view, fields, ["linkedto"]) ?? "";
  const linkedModule = readStringByAliases(view, fields, ["linkedtomodule"]) ?? "";
  const linkedTag =
    readStringByAliases(view, fields, ["transitiondestination", "transitiondestin"]) ?? "";
  const linkedWaypoint = readStringByAliases(view, fields, ["linkedwaypoint"]) ?? "";
  const loadScreenId = readIntegerByAliases(view, fields, ["loadscreenid", "loadscreen"]);
  const loadScreen =
    readStringByAliases(view, fields, ["loadscreenid", "loadscreen"]) ??
    (loadScreenId === undefined ? "" : String(Math.trunc(loadScreenId)));
  const linkedToFlags = readIntegerByAliases(view, fields, ["linkedtoflags"]);
  const extra: Record<string, string | number | boolean | null> = {};

  if (linkedToFlags !== undefined) {
    extra.linkedToFlags = Math.trunc(linkedToFlags);
  }
  if (loadScreenId !== undefined) {
    extra.loadScreenId = Math.trunc(loadScreenId);
  }

  const hasTransitionPayload =
    linkedTarget.length > 0 ||
    linkedModule.length > 0 ||
    linkedTag.length > 0 ||
    linkedWaypoint.length > 0 ||
    loadScreen.length > 0 ||
    Object.keys(extra).length > 0;

  if (!hasTransitionPayload) {
    return undefined;
  }

  return {
    linkedTarget,
    linkedModule,
    linkedTag,
    linkedWaypoint,
    loadScreen,
    flags: {},
    extra
  };
}

function parseSoundPositioning(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  fallbackElevation: number
): ParsedAreaSoundPositioningBlueprint {
  const active = readBooleanByAliases(view, fields, ["active"]);
  const continuous = readBooleanByAliases(view, fields, ["continuous"]);
  const looping = readBooleanByAliases(view, fields, ["looping"]);
  const positional = readBooleanByAliases(view, fields, ["positional"]);
  const randomPosition = readBooleanByAliases(view, fields, ["randomposition"]);
  const random = readBooleanByAliases(view, fields, ["random"]);
  const elevation = clampNonNegative(
    readNumberByAliases(view, fields, ["elevation"]) ?? fallbackElevation
  );
  const cutoffDistance = clampNonNegative(
    readNumberByAliases(view, fields, ["maxdistance"]) ?? 10
  );
  const maxVolumeDistance = Math.min(
    clampNonNegative(readNumberByAliases(view, fields, ["mindistance"]) ?? 1),
    cutoffDistance
  );
  const randomRangeWestEast = clampNonNegative(
    readNumberByAliases(view, fields, ["randomrangex", "randomxrange"]) ?? 0
  );
  const randomRangeNorthSouth = clampNonNegative(
    readNumberByAliases(view, fields, ["randomrangey", "randomyrange"]) ?? 0
  );
  const mode =
    positional === false
      ? "everywhere"
      : randomPosition === true || randomRangeWestEast > 0 || randomRangeNorthSouth > 0
        ? "random"
        : "specific";
  const intervalMs = clampNonNegative(
    Math.round(readNumberByAliases(view, fields, ["interval"]) ?? 6000)
  );
  const intervalVariationMs = Math.min(
    clampNonNegative(Math.round(readNumberByAliases(view, fields, ["intervalvrtn"]) ?? 0)),
    intervalMs
  );
  const rawVolume = readNumberByAliases(view, fields, ["volume"]);
  const rawVolumeVariation = readNumberByAliases(view, fields, ["volumevrtn"]);
  const pitchVariation = clampNonNegative(
    readNumberByAliases(view, fields, ["pitchvariation"]) ?? 0
  );
  const priority = clampNonNegative(
    Math.round(readNumberByAliases(view, fields, ["priority"]) ?? 0)
  );
  const hours = readNumberByAliases(view, fields, ["hours"]);
  const times = readNumberByAliases(view, fields, ["times"]);
  const soundList = parseSoundList(view, fields);
  const flags = compactBooleanFlags({
    active,
    continuous,
    looping,
    positional,
    randomPosition,
    random
  });
  const extra: Record<string, string | number | boolean | null> = {};
  if (soundList.length > 0) {
    extra.auroraSoundList = soundList.join("\n");
  }
  if (hours !== undefined) {
    extra.auroraHours = clampNumber(hours);
  }
  if (times !== undefined) {
    extra.auroraTimes = clampNumber(times);
  }

  return {
    mode,
    elevation,
    maxVolumeDistance,
    cutoffDistance,
    randomRangeWestEast: mode === "random" ? randomRangeWestEast : 0,
    randomRangeNorthSouth: mode === "random" ? randomRangeNorthSouth : 0,
    preserve: {
      timeWindow: times === undefined ? "" : String(clampNumber(times)),
      hourMask: hours === undefined ? "" : String(Math.round(hours)),
      active: active ?? true,
      whenToPlay: hours === undefined && times === undefined ? "always" : "hours",
      dayNight: "both",
      playStyle: looping ? "loop" : continuous ? "repeat" : "once",
      playOrder: random ? "random" : "sequential",
      intervalMs,
      intervalVariationMs,
      volume: normalizePercentLike(rawVolume, 1),
      volumeVariation: normalizePercentLike(rawVolumeVariation, 0),
      pitchVariation,
      priority,
      flags,
      extra
    }
  };
}

function parseSoundList(view: GffView, fields: Map<string, GffFieldRef>): string[] {
  const listField = findFieldByAliases(fields, ["sounds"]);
  const structIndices = view.readListStructIndices(listField);
  const sounds: string[] = [];
  for (const structIndex of structIndices) {
    const soundFields = view.getStructFields(structIndex);
    const sound = readStringByAliases(view, soundFields, ["sound", "resref", "soundresref"]);
    if (sound) {
      sounds.push(sound);
    }
  }
  return sounds;
}

function stringifyPlacement(entry: ParsedAreaPlacementBlueprint): string {
  return [
    entry.listKind,
    entry.templateResRef ?? "",
    entry.tag ?? "",
    entry.appearanceType ?? "",
    entry.genericType ?? "",
    entry.x,
    entry.y,
    entry.z,
    entry.bearing,
    entry.visualTransform ? JSON.stringify(entry.visualTransform) : "",
    entry.soundPositioning ? JSON.stringify(entry.soundPositioning) : "",
    entry.doorTransition ? JSON.stringify(entry.doorTransition) : ""
  ].join("|");
}

function deriveBearingFromOrientation(
  xOrientation: number | undefined,
  yOrientation: number | undefined
): number | undefined {
  if (!Number.isFinite(xOrientation ?? Number.NaN) || !Number.isFinite(yOrientation ?? Number.NaN)) {
    return undefined;
  }
  if ((xOrientation ?? 0) === 0 && (yOrientation ?? 0) === 0) {
    return undefined;
  }
  const radians = Math.atan2(-(yOrientation ?? 0), xOrientation ?? 0);
  return (radians * 180) / Math.PI;
}

function deriveBearingFromRadians(value: number): number {
  return radiansToDegrees(value);
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function normalizeBearing(value: number): number {
  const normalized = ((value % 360) + 360) % 360;
  return clampNumber(normalized);
}

function readNameByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): string | undefined {
  return readNameInfoByAliases(view, fields, aliases).text;
}

function readNameInfoByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): { text?: string; strRef?: number; entries?: string[] } {
  const field = findFieldByAliases(fields, aliases);
  const loc = view.readLocString(field);
  const strRef = loc && isValidTalkTableStrRef(loc.strRef) ? loc.strRef : undefined;
  const entries = dedupeNameEntries(loc?.entries ?? []);
  if (loc?.text && loc.text.trim().length > 0) {
    return {
      text: sanitizeUtf8(loc.text),
      ...(strRef !== undefined ? { strRef } : {}),
      ...(entries.length > 0 ? { entries } : {})
    };
  }
  const value = view.readString(field);
  if (!value || value.trim().length === 0) {
    return {
      ...(strRef !== undefined ? { strRef } : {}),
      ...(entries.length > 0 ? { entries } : {})
    };
  }
  return {
    text: sanitizeUtf8(value),
    ...(strRef !== undefined ? { strRef } : {}),
    ...(entries.length > 0 ? { entries } : {})
  };
}

function readAlternateLocalizedNameEntry(
  nameInfo: { text?: string; entries?: string[] },
  primaryText: string | undefined
): string | undefined {
  const primaryKey = normalizeLocalizedNameEntryKey(primaryText);
  return nameInfo.entries?.find((entry) => {
    const normalized = normalizeLocalizedNameEntryKey(entry);
    return normalized.length > 0 && normalized !== primaryKey;
  });
}

function dedupeNameEntries(entries: readonly string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const entry of entries) {
    const sanitized = sanitizeUtf8(entry);
    const key = normalizeLocalizedNameEntryKey(sanitized);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(sanitized);
  }
  return output;
}

function normalizeLocalizedNameEntryKey(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function readStringByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): string | undefined {
  const field = findFieldByAliases(fields, aliases);
  const value = view.readString(field);
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return sanitizeAscii(value);
}

function readNumberByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const field = findFieldByAliases(fields, aliases);
  const value = view.readNumber(field);
  if (!Number.isFinite(value ?? Number.NaN)) {
    return undefined;
  }
  return value;
}

function readIntegerByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const value = readNumberByAliases(view, fields, aliases);
  if (!Number.isFinite(value ?? Number.NaN)) {
    return undefined;
  }
  return Math.trunc(value ?? 0);
}

function readBooleanByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): boolean | undefined {
  const value = readNumberByAliases(view, fields, aliases);
  if (value === undefined) {
    return undefined;
  }
  return value !== 0;
}

function readListCountByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const field = findFieldByAliases(fields, aliases);
  if (!field) {
    return undefined;
  }
  return view.readListStructIndices(field).length;
}

function findFieldByAliases(
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): GffFieldRef | undefined {
  for (const alias of aliases) {
    const found = fields.get(normalizeLabel(alias));
    if (found) {
      return found;
    }
  }
  return undefined;
}

function parseHeader(bytes: Buffer): GffHeader | null {
  if (bytes.length < GFF_HEADER_SIZE_BYTES) {
    return null;
  }

  const header: GffHeader = {
    fileType: bytes.toString("ascii", 0, 4),
    fileVersion: bytes.toString("ascii", 4, 8),
    structOffset: bytes.readUInt32LE(8),
    structCount: bytes.readUInt32LE(12),
    fieldOffset: bytes.readUInt32LE(16),
    fieldCount: bytes.readUInt32LE(20),
    labelOffset: bytes.readUInt32LE(24),
    labelCount: bytes.readUInt32LE(28),
    fieldDataOffset: bytes.readUInt32LE(32),
    fieldDataCount: bytes.readUInt32LE(36),
    fieldIndicesOffset: bytes.readUInt32LE(40),
    fieldIndicesCount: bytes.readUInt32LE(44),
    listIndicesOffset: bytes.readUInt32LE(48),
    listIndicesCount: bytes.readUInt32LE(52)
  };

  if (
    !isRangeWithinBuffer(bytes, header.structOffset, header.structCount * GFF_STRUCT_ENTRY_SIZE_BYTES) ||
    !isRangeWithinBuffer(bytes, header.fieldOffset, header.fieldCount * GFF_FIELD_ENTRY_SIZE_BYTES) ||
    !isRangeWithinBuffer(bytes, header.labelOffset, header.labelCount * GFF_LABEL_ENTRY_SIZE_BYTES) ||
    !isRangeWithinBuffer(bytes, header.fieldDataOffset, header.fieldDataCount) ||
    !isRangeWithinBuffer(bytes, header.fieldIndicesOffset, header.fieldIndicesCount) ||
    !isRangeWithinBuffer(bytes, header.listIndicesOffset, header.listIndicesCount)
  ) {
    return null;
  }

  return header;
}

function parseLabels(bytes: Buffer, header: GffHeader): string[] {
  const labels: string[] = [];
  for (let index = 0; index < header.labelCount; index += 1) {
    const offset = header.labelOffset + index * GFF_LABEL_ENTRY_SIZE_BYTES;
    const raw = bytes.subarray(offset, offset + GFF_LABEL_ENTRY_SIZE_BYTES);
    const nullByteIndex = raw.indexOf(0);
    const usedLength = nullByteIndex >= 0 ? nullByteIndex : raw.length;
    labels.push(raw.subarray(0, usedLength).toString("ascii").trim());
  }
  return labels;
}

function parseStructs(bytes: Buffer, header: GffHeader): GffStructEntry[] {
  const structs: GffStructEntry[] = [];
  for (let index = 0; index < header.structCount; index += 1) {
    const offset = header.structOffset + index * GFF_STRUCT_ENTRY_SIZE_BYTES;
    structs.push({
      typeId: bytes.readUInt32LE(offset),
      dataOrOffset: bytes.readUInt32LE(offset + 4),
      fieldCount: bytes.readUInt32LE(offset + 8)
    });
  }
  return structs;
}

function resolveStructFieldIndices(
  bytes: Buffer,
  header: GffHeader,
  entry: GffStructEntry
): number[] | null {
  if (entry.fieldCount === 0) {
    return [];
  }

  if (entry.fieldCount === 1) {
    return [entry.dataOrOffset];
  }

  const start = header.fieldIndicesOffset + entry.dataOrOffset;
  const expectedSize = entry.fieldCount * 4;
  if (!isRangeWithinBuffer(bytes, start, expectedSize)) {
    return null;
  }

  const indices: number[] = [];
  for (let index = 0; index < entry.fieldCount; index += 1) {
    indices.push(bytes.readUInt32LE(start + index * 4));
  }
  return indices;
}

function readCExoString(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): string | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 4)) {
    return undefined;
  }

  const length = bytes.readUInt32LE(offset);
  const valueOffset = offset + 4;
  if (!isRangeWithinBuffer(bytes, valueOffset, length)) {
    return undefined;
  }

  return sanitizeUtf8(bytes.subarray(valueOffset, valueOffset + length).toString("utf-8"));
}

function readResRef(bytes: Buffer, header: GffHeader, dataOrOffset: number): string | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 1)) {
    return undefined;
  }

  const length = bytes.readUInt8(offset);
  const valueOffset = offset + 1;
  if (!isRangeWithinBuffer(bytes, valueOffset, length)) {
    return undefined;
  }

  return sanitizeAscii(bytes.subarray(valueOffset, valueOffset + length).toString("ascii"));
}

function readCExoLocString(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): ParsedCExoLocString | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 12)) {
    return undefined;
  }

  const totalSize = bytes.readUInt32LE(offset);
  const strRef = bytes.readUInt32LE(offset + 4);
  const stringCount = bytes.readUInt32LE(offset + 8);
  if (!isRangeWithinBuffer(bytes, offset + 12, Math.max(totalSize - 8, 0))) {
    return undefined;
  }

  let cursor = offset + 12;
  const entries: string[] = [];
  for (let index = 0; index < stringCount; index += 1) {
    if (!isRangeWithinBuffer(bytes, cursor, 8)) {
      break;
    }
    cursor += 4;
    const textLength = bytes.readUInt32LE(cursor);
    cursor += 4;
    if (!isRangeWithinBuffer(bytes, cursor, textLength)) {
      break;
    }
    const text = sanitizeUtf8(bytes.subarray(cursor, cursor + textLength).toString("utf-8"));
    cursor += textLength;
    if (text.length > 0) {
      entries.push(text);
    }
  }

  return {
    strRef,
    text: entries[0] ?? "",
    entries
  };
}

function isRangeWithinBuffer(bytes: Buffer, offset: number, length: number): boolean {
  if (!Number.isFinite(offset) || !Number.isFinite(length)) {
    return false;
  }
  if (offset < 0 || length < 0) {
    return false;
  }
  if (offset > bytes.length) {
    return false;
  }
  if (offset + length > bytes.length) {
    return false;
  }
  return true;
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function sanitizeAscii(value: string): string {
  return value.replace(/\0/gu, "").trim();
}

function sanitizeUtf8(value: string): string {
  return value.replace(/\0/gu, "").trim();
}

function isValidTalkTableStrRef(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value !== 0xffffffff;
}

function clampNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(4));
}

function clampNonNegative(value: number): number {
  return Math.max(0, clampNumber(value));
}

function normalizePercentLike(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return fallback;
  }
  const numeric = clampNonNegative(value ?? fallback);
  return numeric > 1 ? Math.min(numeric / 100, 1) : Math.min(numeric, 1);
}

function compactBooleanFlags(
  flags: Record<string, boolean | undefined>
): Record<string, boolean> {
  const output: Record<string, boolean> = {};
  Object.entries(flags).forEach(([key, value]) => {
    if (typeof value === "boolean") {
      output[key] = value;
    }
  });
  return output;
}

export const __auroraGffAreaParserInternals = {
  deriveBearingFromRadians,
  deriveBearingFromOrientation,
  radiansToDegrees,
  normalizeBearing,
  normalizeTileOrientation,
  normalizeLabel,
  sanitizeAscii,
  sanitizeUtf8,
  isRangeWithinBuffer,
  normalizePercentLike
} as const;
